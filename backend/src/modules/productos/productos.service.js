import {prisma } from  "../../shared/prisma.js";

export async function ListarProductos() {
return prisma.producto.findMany({
        where: { activo: true},
        include: {categoria: true, proveedor: true}
    });

}