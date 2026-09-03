# Apuntes de sesión — productos.service

## 1. Migración (esto lo hizo Claude, para repetirlo tú)
```bash
cd backend
docker start mi-proyecto-node-db   # la base debe estar UP, si no el migrate se cuelga
npx prisma migrate dev --name init # crea prisma/migrations/XXXX_init/migration.sql y aplica a la DB
npx prisma generate                # genera src/generated/prisma (está en .gitignore)
```
- `prisma.config.ts` lee `DATABASE_URL` del `.env` para el CLI.
- `src/shared/prisma.js` usa `PrismaPg` adapter para la app.
- Ver tablas: `npx prisma studio` (localhost:5555).

## 2. Cómo probar un service sin levantar el servidor
Archivo desechable `backend/probar.js` (no se commitea):
```js
import { crearProducto } from './src/modules/productos/productos.service.js';
const r = await crearProducto({ nombre: 'NOMBRE-UNICO', proveedor_id: 1, categoria_id: 1 });
console.log(r);
process.exit(0);
```
Correr:
```bash
cd backend
node --env-file=.env probar.js
```
- `--env-file` es obligatorio, si no `DATABASE_URL` llega vacío y se queda colgado.
- `nombre` es `@unique`: cada prueba usa un nombre nuevo o da `P2002`.
- `proveedor_id=1` y `categoria_id=1` ya existen (Distribuidora Norte / Periféricos). Si usas otro id inexistente da error FK.
- Si se queda quieto: `docker ps` → si el contenedor está `Exited`, haz `docker start mi-proyecto-node-db`.

## 3. Errores ya vistos
- `P2002 Producto_nombre_key` = el insert funciona, pero ese nombre ya existe. No es bug, cambia el nombre.
- `where: {id}` dentro de `create()` = mal, `create` solo lleva `data`. El `id` es autoincrement.
- Contenedor `Exited` = `probar.js` se queda colgado esperando conexión.

## 4. Qué prosigue
1. `productos.controller.js`: 5 funciones (listar, obtener, crear, actualizar, eliminar). Lee `req.params.id` con `Number()`, `req.body`, responde `res.json()` / `201` / `404`.
2. `productos.router.js`: `Router()`, mapea `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`.
3. `server.js`: `app.use('/productos', productosRouter)`.
4. Probar CRUD con `curl` o Thunder Client.
5. Borrar `probar.js` antes de commitear.
