-- Las RPC que leen y renuevan los tokens de Gmail eran ejecutables por
-- anon/authenticated vía /rest/v1/rpc. Validaban que la conexión fuera del
-- usuario, pero con una sesión robada se podía sacar el refresh token de
-- Gmail desde el navegador. Ahora solo el backend (service_role) las usa, a
-- través de las versiones _servicio y después de verificar la conexión con
-- el JWT del usuario.
--
-- Se revoca también a PUBLIC: Postgres le da EXECUTE a PUBLIC por defecto, y
-- sin eso anon/authenticated lo seguirían heredando.
REVOKE EXECUTE ON FUNCTION public.leer_tokens_conexion(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.actualizar_tokens_conexion(uuid, text, text, timestamp with time zone) FROM PUBLIC, anon, authenticated;

-- Crear/eliminar conexiones sí las llama el backend con el JWT del usuario
-- (authenticated), pero nunca alguien sin sesión.
REVOKE EXECUTE ON FUNCTION public.crear_conexion(character varying, character varying, character varying, text[], text, text, timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.eliminar_conexion(uuid) FROM PUBLIC, anon;
