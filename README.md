# mi-proyecto-node

Sistema de inventario y pedidos multi-sede. Proyecto de aprendizaje: el objetivo no es
terminarlo rápido, es entender cada línea que se escribe.

- **Backend:** Node.js + Express 5 + Prisma 7 + PostgreSQL
- **Frontend:** React 19 + Vite (todavía sin tocar, es el scaffold por defecto)

---

## Estado actual

| Parte | Estado |
|---|---|
| Modelo de datos (`schema.prisma`) | Completo y migrado a la base de datos |
| Base de datos PostgreSQL | Corriendo en Docker, migración `init` aplicada |
| Cliente de Prisma (`src/shared/prisma.js`) | Hecho |
| Módulo `productos` (service + controller + router) | **Completo** — CRUD probado de punta a punta con `curl` |
| Resto de módulos (usuarios, sedes, inventario, ordenes, pedidos, proveedores) | Carpetas creadas, archivos vacíos |
| `server.js` | Router de `productos` montado en `/productos` |
| Frontend | Scaffold de Vite sin modificar |

---

## Puesta en marcha

### 1. Levantar la base de datos

La base corre en un contenedor Docker dedicado (puerto **5436**, porque 5432 y 5433 ya
estaban ocupados por otros Postgres en esta máquina):

```bash
docker start mi-proyecto-node-db
```

Si el contenedor no existe todavía (máquina nueva), se crea así:

```bash
docker run -d --name mi-proyecto-node-db \
  -e POSTGRES_USER=inventario_user \
  -e POSTGRES_PASSWORD=servicio123 \
  -e POSTGRES_DB=proyecto_node_db \
  -p 5436:5432 \
  postgres:16-alpine
```

### 2. Variables de entorno

`backend/.env` no está en git (tiene credenciales). Debe contener:

```
PORT=3000
DATABASE_URL="postgresql://inventario_user:servicio123@localhost:5436/proyecto_node_db"
```

### 3. Instalar dependencias y preparar Prisma

```bash
cd backend
npm install
npx prisma migrate dev     # aplica las migraciones a la base de datos
npx prisma generate        # genera el cliente en src/generated/prisma
```

### 4. Correr

```bash
npm start                  # backend en http://localhost:3000
cd ../frontend && npm run dev   # frontend en http://localhost:5173
```

`npm start` corre `node --env-file=.env src/server.js`. El `--env-file` es obligatorio: los
módulos (incluido `shared/prisma.js`) se ejecutan en cuanto se importan, así que las
variables de entorno tienen que existir **antes** de que Node cargue cualquier `import` del
archivo. Por eso `server.js` no usa el paquete `dotenv` — llamarlo con `dotenv.config()`
dentro del archivo llega demasiado tarde, porque los `import` de arriba ya se ejecutaron.

---

## Arquitectura: el patrón de módulos

Cada entidad vive en `backend/src/modules/<entidad>/` con tres archivos, y cada uno
tiene **una sola responsabilidad**:

```
petición HTTP
     ↓
router.js       →  define las URLs y los verbos (GET /productos, POST /productos…)
     ↓
controller.js   →  lee req.params / req.body, decide el status HTTP, arma la respuesta
     ↓
service.js      →  habla con la base de datos vía Prisma. No sabe qué es HTTP.
     ↓
base de datos
```

La regla de oro: **el service nunca toca `req` ni `res`**, y **el controller nunca llama
a Prisma directamente**. Si respetas eso, puedes reusar un service desde otro service, o
desde un script, sin arrastrar HTTP.

### Convenciones

- Funciones y variables en `camelCase` (`listarProductos`, no `ListarProductos`).
- Modelos de Prisma en `PascalCase` singular (`Producto`, `OrdenDetalle`).
- En el código JS el modelo se accede en minúscula: `prisma.producto`, `prisma.ordenDetalle`.
- **Borrado lógico (soft delete):** no se borran filas. Todas las tablas tienen `activo Boolean`;
  "eliminar" es hacer `update` con `activo: false`, y los listados filtran `where: { activo: true }`.

---

## Cómo verificar tu trabajo

### Ver la base de datos con interfaz gráfica

```bash
npx prisma studio      # abre localhost:5555
```

Sirve para confirmar si un `create` realmente insertó, o para crear datos a mano.

### Probar una función del service sin levantar el servidor

Crea un `backend/probar.js` desechable:

```js
import { obtenerProducto } from './src/modules/productos/productos.service.js';

const resultado = await obtenerProducto(1);
console.log(resultado);
```

Y córrelo con:

```bash
node --env-file=.env probar.js
```

El `--env-file` es obligatorio: `shared/prisma.js` lee `process.env.DATABASE_URL` en el
momento en que se importa, así que las variables tienen que estar cargadas **antes** de
que corra cualquier módulo.

### Probar la API ya montada

```bash
npm start
curl http://localhost:3000/productos
curl -X POST http://localhost:3000/productos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Teclado","proveedor_id":1,"categoria_id":1}'
```

---

## Plan de trabajo

### Hecho — `productos` de punta a punta

Módulo piloto completo (service, controller, router, montado en `server.js`) y probado con
`curl`: crear, listar, obtener, actualizar, eliminar (soft delete), y los 404 correctos
cuando el `id` no existe. Este es el patrón a repetir en los módulos que siguen.

> **Ojo con esto:** no se puede crear un `Producto` sin que existan antes un `Proveedor` y
> una `Categoria`, porque `proveedor_id` y `categoria_id` son claves foráneas obligatorias.
> Si intentas un POST con ids inexistentes, Postgres rechaza el insert. Crea primero un
> proveedor y una categoría desde Prisma Studio para poder probar.

### Ahora — replicar el patrón

Orden sugerido, de menos a más dependencias:

1. `categorias` y `proveedores` (no dependen de nadie)
2. `sedes`
3. `usuarios` (depende de `Role` y `Sede`; aquí entra hashear la contraseña con `bcrypt`
   antes de guardar en `password_hash` — nunca guardar contraseñas en texto plano)
4. `inventario` (depende de `Sede` y `Producto`)
5. `ordenes` y `pedidos` (los más complejos: hay que crear la cabecera y sus detalles en
   una sola transacción, y calcular el `total`)

### Más adelante

- **Manejo de errores:** un middleware de errores centralizado en Express en vez de repetir
  `try/catch` en cada controller. (Express 5 ya reenvía automáticamente las promesas
  rechazadas de handlers `async` al middleware de errores — Express 4 no lo hacía.)
- **Validación de entrada:** validar `req.body` antes de tocar la base de datos (por ejemplo
  con `zod`), para no confiar en lo que manda el cliente.
- **Autenticación:** login con JWT, middleware que proteja las rutas, y permisos por `Role`.
- **`log.service.js`:** el modelo `Log` ya existe en el schema para auditoría
  (quién cambió qué, valor anterior y nuevo). Está sin implementar.
- **Frontend:** consumir la API desde React, empezando por un listado de productos.

### Mejoras de infraestructura (opcionales, cuando molesten)

- `docker-compose.yml` para levantar la base con un solo comando, en vez del `docker run`
  a mano.
- Script `"dev": "node --watch --env-file=.env src/server.js"` en `package.json`, para que
  el servidor se reinicie solo al guardar.
- Tests automatizados.

---

## Deuda técnica conocida

Cosas que funcionan pero convendría arreglar en algún momento:

- `Sede.iventario` — falta la `n`, debería ser `inventario`.
- `model pedidoDetalle` — está en minúscula; por consistencia con `OrdenDetalle` debería
  ser `PedidoDetalle`.
- `ListarProductos` — debería ser `listarProductos` (camelCase).
- Se eliminó un `model trasferencia` que estaba vacío (solo tenía `id`). Si se quieren
  transferencias de stock entre sedes, hay que definirlo bien: sede origen, sede destino,
  producto, cantidad, fecha, estado.
- `Usuario.nombre` es `@unique`. Es una decisión fuerte (dos personas no podrían llamarse
  igual); revisar si es lo que se quiere.

---

## Notas sobre Prisma 7

Prisma 7 cambió cosas respecto a los tutoriales que encuentras en internet (que casi todos
son de Prisma 5 o 6). Si algo no cuadra con lo que dice un tutorial, es probablemente esto:

- **La URL de conexión ya no va en `schema.prisma`.** El bloque `datasource` no lleva
  `url = env("DATABASE_URL")`; si lo pones, el CLI falla con error `P1012`.
- Para el **CLI** (`prisma migrate`, `prisma studio`), la URL sale de `prisma.config.ts`.
- Para el **código de la aplicación**, hay que pasarle un *driver adapter* al constructor:

  ```js
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  export const prisma = new PrismaClient({ adapter });
  ```

- El cliente se genera en `src/generated/prisma` (configurado en el bloque `generator`),
  no en `node_modules/@prisma/client`. Por eso el import es
  `from '../generated/prisma/index.js'`.
- `src/generated/` está en `.gitignore`: es código generado, se recrea con
  `npx prisma generate`. Por eso ese comando es obligatorio tras clonar el repo.

---

## Cómo se trabaja en este proyecto (con Claude)

Este es un proyecto de aprendizaje. **El código de la aplicación lo escribe Robert, no el
asistente.** El rol de Claude aquí es de mentor y auditor:

- Explica sintaxis y conceptos antes de que se escriba el código.
- Da la estructura y las pistas, pero deja los huecos para que se resuelvan.
- Revisa lo escrito como un code review: qué está mal, por qué, y qué convendría mejorar.
- Sí puede encargarse de infraestructura (migraciones, contenedores, dependencias,
  documentación), porque ahí no está la práctica.

Si el asistente empieza a escribir services, controllers, routers o componentes por su
cuenta, hay que frenarlo.
