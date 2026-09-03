# Docker, explicado sobre este proyecto

Guía práctica escrita sobre el contenedor real de `mi-proyecto-node`. No es un tutorial
genérico: todos los ejemplos son cosas que puedes correr ahora mismo en esta máquina.

---

## 1. Qué problema resuelve

Para que este proyecto funcione necesitas PostgreSQL. Sin Docker, tus opciones serían:

- Instalar PostgreSQL en tu Windows/WSL, configurarlo, crear el usuario, la base…
- Y si mañana otro proyecto necesita PostgreSQL 14 y este necesita el 16, tienes un problema.
- Y si formateas la máquina, repites todo el proceso de memoria.

Docker resuelve eso empaquetando **el programa junto con todo lo que necesita para correr**
(su sistema operativo mínimo, sus librerías, su configuración) en algo que se levanta con
un comando y se borra sin dejar rastro.

De hecho ya lo estás viviendo: en esta máquina hay **cuatro** PostgreSQL distintos corriendo
a la vez, en puertos diferentes, sin pisarse. Uno es el tuyo (5436), otros son de proyectos
distintos (5433, 5435) y hay uno instalado nativamente en WSL (5434). Sin Docker eso sería
un infierno de configuración.

---

## 2. Los tres conceptos que hay que separar

Esto es lo que más se confunde al principio. Son cosas distintas:

| Concepto | Qué es | Analogía |
|---|---|---|
| **Imagen** | Una plantilla de solo lectura. Contiene PostgreSQL instalado y listo, pero apagado. | La receta |
| **Contenedor** | Una instancia viva de una imagen, ejecutándose. | El plato ya cocinado |
| **Volumen** | Un almacén de datos que vive **fuera** del contenedor y sobrevive si lo borras. | La despensa |

De una misma imagen puedes crear muchos contenedores. Por eso en esta máquina hay varios
Postgres: comparten la imagen `postgres:16-alpine`, pero cada uno es un contenedor aparte
con sus propios datos.

**Donde la analogía se rompe:** un plato cocinado no se puede "apagar y volver a encender"
conservando su estado, y un contenedor sí (`docker stop` / `docker start`).

---

## 3. Tu comando, desarmado

Este es el comando con el que se creó la base de datos de este proyecto:

```bash
docker run -d --name mi-proyecto-node-db \
  -e POSTGRES_USER=inventario_user \
  -e POSTGRES_PASSWORD=servicio123 \
  -e POSTGRES_DB=proyecto_node_db \
  -p 5436:5432 \
  postgres:16-alpine
```

Pieza por pieza:

| Parte | Qué hace |
|---|---|
| `docker run` | Crea un contenedor **nuevo** a partir de una imagen y lo arranca. Ojo: `run` siempre crea uno nuevo — no es el comando para volver a encender uno existente. |
| `-d` | *detached*, "desacoplado". Lo deja corriendo en segundo plano y te devuelve la terminal. Sin esto, tu terminal queda ocupada mostrando los logs. |
| `--name mi-proyecto-node-db` | Le pone nombre. Sin esto Docker le inventa uno aleatorio tipo `nostalgic_pasteur` y tendrías que buscarlo por ID cada vez. |
| `-e CLAVE=valor` | *environment*, variable de entorno. Se la pasa al programa de adentro. La imagen de Postgres está programada para leer `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` **la primera vez que arranca**, y con eso crea el usuario y la base. |
| `-p 5436:5432` | *publish*, mapeo de puertos. Ver abajo, tiene truco. |
| `postgres:16-alpine` | La imagen. `postgres` es el nombre, `16-alpine` es la etiqueta: versión 16, variante Alpine (una base de Linux minúscula, ~80 MB en vez de ~400 MB). |

### El mapeo de puertos, que es lo que más confunde

```
-p 5436:5432
   ↑     ↑
   │     └── puerto DENTRO del contenedor
   └──────── puerto en TU máquina
```

Se lee de izquierda a derecha: *"lo que llegue al puerto 5436 de mi máquina, mándalo al
puerto 5432 de adentro del contenedor"*.

Postgres **siempre** escucha en el 5432 dentro de su contenedor — eso no cambia nunca. Lo
que tú eliges es por cuál puerto de tu máquina quieres alcanzarlo. Aquí se usó el 5436
porque el 5432 ya estaba ocupado por otro Postgres de Windows, y el 5433/5435 por otros
contenedores.

Por eso tu `DATABASE_URL` dice `localhost:5436`: es el puerto de **fuera**, el único que tu
código de Node puede ver.

---

## 4. Los comandos del día a día

```bash
docker ps                      # contenedores CORRIENDO ahora
docker ps -a                   # todos, incluidos los apagados
docker start mi-proyecto-node-db    # encender uno que ya existe
docker stop mi-proyecto-node-db     # apagarlo (los datos se conservan)
docker logs mi-proyecto-node-db     # ver qué imprimió el programa de adentro
docker logs -f mi-proyecto-node-db  # igual, pero siguiendo en vivo (Ctrl+C para salir)
```

La distinción clave que cuesta al principio:

- **`docker run`** → crea uno **nuevo**. Si lo corres dos veces con el mismo `--name`, falla.
- **`docker start`** → enciende uno que **ya existe**.

Si un día te da `Conflict. The container name "..." is already in use`, es justo eso:
estás usando `run` cuando querías `start`.

### Meterte dentro del contenedor

```bash
docker exec -it mi-proyecto-node-db bash
```

`exec` ejecuta un comando dentro del contenedor; `-it` significa *interactive + tty*, o sea
"quiero una sesión interactiva de verdad, con teclado". Te deja en una terminal **dentro**
de ese mini-Linux. Escribe `exit` para salir.

Muy útil para hablar con Postgres directamente sin instalar nada en tu máquina:

```bash
docker exec -it mi-proyecto-node-db psql -U inventario_user -d proyecto_node_db
```

Ahí adentro puedes escribir SQL. `\dt` lista las tablas, `\q` sale.

---

## 5. Dónde viven tus datos (y una advertencia)

Un contenedor es **efímero**: si lo borras, se va todo lo que había dentro. Entonces, ¿por
qué tus productos siguen ahí después de apagarlo y encenderlo?

Porque la imagen de Postgres declara un **volumen** para su carpeta de datos, y Docker te
creó uno automáticamente. Puedes verlo:

```bash
docker inspect mi-proyecto-node-db --format '{{json .Mounts}}'
docker volume ls
```

Aquí está el detalle importante: ese volumen es **anónimo**. Se llama así:

```
70c72d72dae530c6faac637389a6d3083e5c1f3ceb4220a7a553831c2076b93a
```

Un volumen anónimo funciona, pero tiene dos problemas prácticos:

1. **No sabes cuál es cuál.** Si tienes cinco volúmenes con nombres de hash, no puedes
   distinguir el de este proyecto del de otro.
2. **Se queda huérfano.** Si borras el contenedor (`docker rm`), el volumen **no** se borra:
   se queda ahí ocupando disco, sin que nada lo use, y ya no hay forma fácil de saber qué
   contenía. Con el tiempo acumulas basura invisible.

Lo correcto es ponerle nombre desde el principio, con `-v`:

```bash
-v mi-proyecto-node-datos:/var/lib/postgresql/data
```

Que se lee: *"monta el volumen llamado `mi-proyecto-node-datos` en la carpeta
`/var/lib/postgresql/data` de adentro del contenedor"* — que es donde Postgres guarda todo.

Con eso, puedes borrar y recrear el contenedor cuantas veces quieras y los datos siguen
intactos, porque viven en el volumen, no en el contenedor.

> **Esto es deuda técnica real de este proyecto.** Ahora mismo la base de datos funciona,
> pero sus datos están en un volumen anónimo. Arreglarlo es parte del ejercicio de abajo.

---

## 6. Dos cosas que ya te mordieron

### "El contenedor no está corriendo cuando vuelvo"

Te pasó hoy. Es porque se creó sin política de reinicio:

```bash
docker inspect mi-proyecto-node-db --format '{{.HostConfig.RestartPolicy.Name}}'
# → no
```

`no` significa "si me apago, no me levanto solo". Al reiniciar la máquina (o Docker), el
contenedor se queda apagado y tienes que hacer `docker start` a mano.

Se arregla con `--restart unless-stopped`, que significa *"vuelve a levantarte siempre,
salvo que yo te haya apagado a propósito"*.

### "El puerto ya está en uso"

Si intentas mapear un puerto que otro proceso ocupa, Docker falla con
`port is already allocated`. La solución es elegir otro puerto de tu lado (el número de la
izquierda en `-p`). El de la derecha nunca se toca.

Para ver qué contenedor tiene tomado qué puerto:

```bash
docker ps --format '{{.Names}}\t{{.Ports}}'
```

---

## 7. El ejercicio: pasar de `docker run` a `docker-compose`

Escribir ese comando de 7 líneas cada vez es incómodo, es fácil equivocarse, y sobre todo:
**no queda registrado en el repositorio**. Si formateas la máquina, la configuración de tu
base de datos existe solamente en tu memoria.

Docker Compose resuelve eso: describes el contenedor en un archivo `docker-compose.yml`,
lo commiteas, y levantar todo el entorno es `docker compose up -d`.

La traducción es casi mecánica — cada bandera del comando es una línea del archivo:

| En `docker run` | En `docker-compose.yml` |
|---|---|
| `postgres:16-alpine` | `image: postgres:16-alpine` |
| `--name X` | `container_name: X` |
| `-e CLAVE=valor` | dentro de `environment:` |
| `-p 5436:5432` | dentro de `ports:` |
| `-v nombre:/ruta` | dentro de `volumes:` |
| `--restart unless-stopped` | `restart: unless-stopped` |
| `-d` | no existe; se pasa al comando: `docker compose up -d` |

El esqueleto, para que lo rellenes tú:

```yaml
services:
  db:
    image: ???
    container_name: ???
    restart: ???
    environment:
      POSTGRES_USER: ???
      POSTGRES_PASSWORD: ???
      POSTGRES_DB: ???
    ports:
      - "???:???"
    volumes:
      - ???:/var/lib/postgresql/data

volumes:
  ???:
```

Notas para cuando lo escribas:

- **YAML se indenta con espacios, nunca con tabuladores.** Un tabulador rompe el archivo.
  La indentación *es* la sintaxis: define qué está dentro de qué.
- El bloque `volumes:` de hasta abajo (al mismo nivel que `services:`) es donde se **declara**
  el volumen con nombre. El `volumes:` de adentro del servicio es donde se **usa**. Los dos
  nombres tienen que coincidir.
- `services:` puede tener varios. Más adelante podrías agregar ahí el propio backend.

### Migrar sin perder los datos actuales

Si haces esto con un volumen nuevo, la base arranca vacía (perderías el producto de prueba,
que no importa). Si algún día necesitas conservar datos reales, el camino es sacar un respaldo
antes y restaurarlo después:

```bash
docker exec mi-proyecto-node-db pg_dump -U inventario_user proyecto_node_db > respaldo.sql
```

Y después de levantar el contenedor nuevo:

```bash
docker exec -i mi-proyecto-node-db psql -U inventario_user -d proyecto_node_db < respaldo.sql
```

---

## 8. Limpieza

Comandos que conviene conocer, en orden de peligrosidad:

```bash
docker stop <nombre>       # apagar. Inofensivo.
docker rm <nombre>         # borrar el contenedor. Los volúmenes NO se borran.
docker volume ls           # listar volúmenes
docker volume rm <nombre>  # borrar un volumen. ESTO SÍ BORRA DATOS.
```

Y uno que da mucho espacio pero hay que usar sabiendo qué hace:

```bash
docker system prune        # borra contenedores parados, redes sin usar, caché de builds
```

No toca volúmenes por defecto — por eso los volúmenes anónimos se acumulan. `prune -a --volumes`
sí los borra, y ahí es donde la gente pierde datos sin querer. No lo corras con prisa.

---

## Resumen de lo mínimo que hay que retener

1. **Imagen** = plantilla. **Contenedor** = instancia corriendo. **Volumen** = los datos.
2. `run` crea uno nuevo; `start` enciende uno que ya existe.
3. En `-p A:B`, A es tu máquina y B es el contenedor. Solo cambias A.
4. Si los datos importan, el volumen va **con nombre**, no anónimo.
5. Todo lo que configures a mano en la terminal se pierde. Lo que va en `docker-compose.yml`
   queda en el repositorio.
