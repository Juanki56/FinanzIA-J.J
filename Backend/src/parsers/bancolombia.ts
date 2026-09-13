import type { CorreoParseado, Grupos5, PlantillaBancaria, RegistroBanco } from './types.js';

// --- Parseo de montos: Bancolombia NO usa un formato consistente entre plantillas ---
// "Compraste" usa formato LATINO (punto=miles, coma=decimales): "448.300,00" -> 448300.00
// El resto usa formato US (coma=miles, punto=decimales): "5,500.00" -> 5500.00
function parsearMontoFormatoUS(texto: string): number {
  return parseFloat(texto.replace(/,/g, ''));
}
function parsearMontoFormatoLatino(texto: string): number {
  return parseFloat(texto.replace(/\./g, '').replace(',', '.'));
}

// --- Fechas: normaliza año de 2 dígitos a 4, y combina fecha+hora asumiendo
// hora de Colombia (UTC-5 todo el año, sin horario de verano) para producir
// un ISO 8601 en UTC. ---
function normalizarAnio(fecha: string): string {
  const [dia, mes, anio] = fecha.split('/') as [string, string, string];
  const anioNormalizado = anio.length === 2 ? `20${anio}` : anio;
  return `${dia}/${mes}/${anioNormalizado}`;
}

function combinarFechaHoraColombia(fecha: string, hora: string): string {
  const [dia, mes, anio] = normalizarAnio(fecha).split('/').map(Number) as [number, number, number];
  const [h, min] = hora.split(':').map(Number) as [number, number];
  return new Date(Date.UTC(anio, mes - 1, dia, h + 5, min)).toISOString();
}

const PLANTILLAS: PlantillaBancaria[] = [
  {
    // Plantilla 1: Compra con tarjeta débito
    // "Bancolombia: Compraste $448.300,00 en INVERSIONES TNS VIVA con tu T.Deb *0914, el 05/09/2026 a las 17:13."
    nombre: 'compra_tarjeta_debito',
    regex: /Compraste \$([\d.,]+) en (.+?) con tu T\.Deb \*(\d+), el (\d{2}\/\d{2}\/\d{4}) a las (\d{2}:\d{2})/,
    interpretar([monto, comercio, ultimosDigitos, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'expense',
        monto: parsearMontoFormatoLatino(monto),
        comercio,
        descripcion: `Compra con T.Deb *${ultimosDigitos}`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
  {
    // Plantilla 2: Retiro en corresponsal/cajero
    // "Bancolombia: Retiraste $170,000 en nuestro corresponsal BARRIO EL POPULAR 2 MEDELLIN en MEDELLÍN, el 04/09/26 a las 17:07."
    nombre: 'retiro_corresponsal',
    regex: /Retiraste \$([\d.,]+) en (?:nuestro corresponsal )?(.+?) en ([A-ZÁÉÍÓÚÑ ]+), el (\d{2}\/\d{2}\/(?:\d{2}|\d{4})) a las (\d{2}:\d{2})/,
    interpretar([monto, lugar, ciudad, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'expense',
        monto: parsearMontoFormatoUS(monto),
        // Un retiro casi siempre es su propia categoría (Efectivo/Retiros), no
        // un comercio para buscar coincidencia — igual se deja pasar por el
        // motor de reglas por si el usuario quiere una regla explícita.
        comercio: `Retiro efectivo - ${lugar}`,
        descripcion: `Retiro en ${lugar}, ${ciudad.trim()}`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
  {
    // Plantilla 3: Transferencia enviada
    // "Bancolombia: Transferiste $5,500.00 desde tu cuenta *9247 a la cuenta *3011541559 el 04/09/26 a las 21:49."
    // Encontrado probando contra correos reales: el "*" antes de la cuenta
    // ORIGEN no siempre aparece ("desde tu cuenta 9247" sin asterisco en
    // varios correos reales) — antes de este fix, esos 6/12 correos reales
    // no reconocidos de la primera corrida real caían aquí por ese motivo.
    // Caso especial: no sabemos si la cuenta destino es propia o de un tercero
    // (cuentas no tiene número de cuenta bancario real para cruzar), así que
    // esto queda documentado en la descripción para que el usuario decida.
    nombre: 'transferencia_enviada',
    regex: /Transferiste \$([\d.,]+) desde tu cuenta \*?(\d+) a la cuenta \*(\d+) el (\d{2}\/\d{2}\/(?:\d{2}|\d{4})) a las (\d{2}:\d{2})/,
    interpretar([monto, cuentaOrigen, cuentaDestino, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'expense',
        monto: parsearMontoFormatoUS(monto),
        comercio: null,
        descripcion: `Transferencia a cuenta terminada en ${cuentaDestino} — verifica si es una cuenta propia o de un tercero (desde *${cuentaOrigen})`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
  {
    // Plantilla 4: Recarga (tarjeta cívica u otro concepto)
    // "Bancolombia le informa Recarga de Tarjeta Civica por $10,000.00 desde cta *9247. 05/09/2026 19:24."
    nombre: 'recarga',
    regex: /le informa Recarga de (.+?) por \$([\d.,]+) desde cta \*(\d+)\.\s*(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})/,
    interpretar([concepto, monto, cuentaOrigen, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'expense',
        monto: parsearMontoFormatoUS(monto),
        comercio: concepto,
        descripcion: `Recarga de ${concepto} desde cta *${cuentaOrigen}`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
  {
    // Plantilla 5: Pago de nómina recibido
    // "Bancolombia: Recibiste un pago de Nomina de DOUBLE V PARTNE por $1,735,867.00 en tu cuenta de Ahorros el 31/08/2026 a las 16:02."
    nombre: 'pago_nomina',
    regex: /Recibiste un pago de Nomina de (.+?) por \$([\d.,]+) en tu cuenta de (.+?) el (\d{2}\/\d{2}\/\d{4}) a las (\d{2}:\d{2})/,
    interpretar([empleador, monto, tipoCuenta, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'income',
        monto: parsearMontoFormatoUS(monto),
        comercio: empleador,
        descripcion: `Nómina de ${empleador} en cuenta de ${tipoCuenta}`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
  {
    // Plantilla 6: Consignación recibida (distinta a nómina)
    // "Bancolombia: Recibiste una consignacion por $250,000 desde el corresponsal PAGAFACIL MINORISTA en MEDELLÍN, el 11/07/26 08:58."
    // Nota estructural: aquí NO hay "a las" antes de la hora.
    nombre: 'consignacion_recibida',
    regex: /Recibiste una consignacion por \$([\d.,]+) desde el corresponsal (.+?) en ([A-ZÁÉÍÓÚÑ ]+), el (\d{2}\/\d{2}\/(?:\d{2}|\d{4})) (\d{2}:\d{2})/,
    interpretar([monto, corresponsal, ciudad, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'income',
        monto: parsearMontoFormatoUS(monto),
        comercio: corresponsal,
        descripcion: `Consignación desde ${corresponsal}, ${ciudad.trim()}`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
  {
    // Plantilla 7: Pago con código QR
    // "Bancolombia: JUAN JOSE ABELLO AGUIRRE pagaste $250,000.00 por codigo QR desde tu cuenta *9247 a la llave @opticaenfoque360 el 11/07/2026 a las 12:40."
    // El nombre del usuario en mayúsculas antes de "pagaste" no se captura, el
    // regex ya empieza a buscar desde "pagaste" en adelante.
    nombre: 'pago_qr',
    regex: /pagaste \$([\d.,]+) por codigo QR desde tu cuenta \*(\d+) a la llave (\S+) el (\d{2}\/\d{2}\/\d{4}) a las (\d{2}:\d{2})/,
    interpretar([monto, cuentaOrigen, llave, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'expense',
        monto: parsearMontoFormatoUS(monto),
        comercio: llave,
        descripcion: `Pago QR a ${llave} desde cta *${cuentaOrigen}`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
  // --- Plantillas 8-10: encontradas probando contra correos reales de la
  // bandeja del usuario (no estaban en las 7 originales), a partir de texto
  // real capturado, no inventado. ---
  {
    // Plantilla 8: Transferencia recibida de otra persona
    // "Bancolombia: Recibiste una transferencia por $100,000 de SEBASTIAN BARRIOS en tu cuenta **9247, el 16/07/2026 a las 20:52."
    nombre: 'transferencia_recibida_persona',
    regex: /Recibiste una transferencia por \$([\d.,]+) de (.+?) en tu cuenta \*+(\d+), el (\d{2}\/\d{2}\/(?:\d{2}|\d{4})) a las (\d{2}:\d{2})/,
    interpretar([monto, remitente, cuentaPropia, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'income',
        monto: parsearMontoFormatoUS(monto),
        comercio: remitente,
        descripcion: `Transferencia recibida de ${remitente} en cuenta *${cuentaPropia}`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
  {
    // Plantilla 9: Pago con "Botón Bancolombia" (pasarela de pagos)
    // "NotificaciónTransaccionalBancolombia: Transferiste $49,900.00 por Boton Bancolombia a COMUNICACION CELULAR SA COMCEL desde producto *9247. 14/07/2026 13:56:44"
    // Nota: fecha y hora van pegadas sin "a las", y la hora trae segundos.
    nombre: 'pago_boton_bancolombia',
    regex: /Transferiste \$([\d.,]+) por Boton Bancolombia a (.+?) desde producto \*(\d+)\.\s*(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2}):\d{2}/,
    interpretar([monto, comercio, cuentaOrigen, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'expense',
        monto: parsearMontoFormatoUS(monto),
        comercio,
        descripcion: `Pago con Botón Bancolombia a ${comercio} desde producto *${cuentaOrigen}`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
  {
    // Plantilla 10: "Pagaste ... desde tu producto" (sin "a las", sin "*")
    // "Bancolombia: Pagaste $116,040.00 a PEXTO COLOMBIA SAS desde tu producto 9247 el 27/06/2026 12:29:54."
    nombre: 'pago_producto',
    regex: /Pagaste \$([\d.,]+) a (.+?) desde tu producto (\d+) el (\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2}):\d{2}/,
    interpretar([monto, comercio, cuentaOrigen, fecha, hora]: Grupos5): CorreoParseado {
      return {
        tipo: 'expense',
        monto: parsearMontoFormatoUS(monto),
        comercio,
        descripcion: `Pago a ${comercio} desde producto ${cuentaOrigen}`,
        fecha_movimiento: combinarFechaHoraColombia(fecha, hora),
      };
    },
  },
];

export const BANCOLOMBIA: RegistroBanco = {
  remitente: 'alertasynotificaciones@an.notificacionesbancolombia.com',
  plantillas: PLANTILLAS,
};

/**
 * Prueba las plantillas de Bancolombia en orden, la primera que hace match gana.
 * Devuelve null si ninguna reconoce el texto (correo "sin_reconocer").
 */
export function parsearCorreoBancolombia(texto: string): CorreoParseado | null {
  for (const plantilla of PLANTILLAS) {
    const match = texto.match(plantilla.regex);
    if (match) {
      return plantilla.interpretar(match.slice(1) as Grupos5);
    }
  }
  return null;
}

// Exportado solo para pruebas.
export { parsearMontoFormatoUS, parsearMontoFormatoLatino, combinarFechaHoraColombia, PLANTILLAS };
