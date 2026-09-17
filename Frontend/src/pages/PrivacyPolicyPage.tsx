export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-6 py-12 text-ink-300">
      <h1 className="font-display text-2xl text-ink-100">Política de privacidad de FinanzIA</h1>
      <p className="mt-1 text-sm text-ink-500">Última actualización: 17 de septiembre de 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 font-display text-lg text-ink-100">¿Qué es FinanzIA?</h2>
          <p>
            FinanzIA es una aplicación personal de finanzas para llevar el control de ingresos,
            gastos, transferencias, presupuestos y objetivos de ahorro. Es un proyecto de uso
            individual, no un producto comercial abierto al público.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg text-ink-100">Acceso a Gmail</h2>
          <p>
            Si conectas tu cuenta de Google, FinanzIA solicita el permiso de solo lectura
            <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5">gmail.readonly</code>
            exclusivamente para buscar y leer correos de notificación transaccional de tu banco
            (por ejemplo, alertas de Bancolombia). Con esos correos, extrae automáticamente datos
            como el monto, la fecha y el tipo de movimiento, para registrarlos como movimientos en
            tu cuenta de FinanzIA.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>No se leen, almacenan ni comparten correos que no sean notificaciones bancarias.</li>
            <li>
              El texto del correo se guarda únicamente para permitir volver a procesarlo si el
              análisis automático falla o necesita corregirse.
            </li>
            <li>No se envían correos, no se modifican ni se eliminan mensajes de tu bandeja.</li>
            <li>
              Los datos de Gmail nunca se venden, ni se comparten con terceros con fines
              publicitarios.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg text-ink-100">Uso de IA (Gemini)</h2>
          <p>
            Opcionalmente, FinanzIA puede usar la API de Gemini (Google) para sugerir una
            categoría de gasto. En ese caso, solo se envía una descripción corta del movimiento
            (comercio y monto) — nunca el contenido completo del correo ni datos de tu cuenta de
            Gmail. La sugerencia siempre requiere confirmación manual, nunca se aplica sola.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg text-ink-100">Dónde vive tu información</h2>
          <p>
            Todos los datos financieros que registras quedan almacenados en una base de datos
            privada (Supabase) asociada únicamente a tu cuenta. Nadie más que tú puede acceder a
            tus movimientos, cuentas o conexiones.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg text-ink-100">Cumplimiento con Google</h2>
          <p>
            El uso que FinanzIA hace de los datos obtenidos mediante las APIs de Google cumple con
            la{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="text-violet-300 underline hover:text-violet-200"
            >
              Política de Datos de Usuario de los Servicios de API de Google
            </a>
            , incluyendo los requisitos de Uso Limitado (Limited Use).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg text-ink-100">Contacto</h2>
          <p>
            Preguntas sobre esta política:{' '}
            <a href="mailto:juan.abello@nyxn.io" className="text-violet-300 underline hover:text-violet-200">
              juan.abello@nyxn.io
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
