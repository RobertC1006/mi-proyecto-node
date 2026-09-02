import {prisma } from  "../../shared/prisma.js";

export async function ListarProductos() {
return prisma.producto.findMany({
        where: { activo: true},
        include: {categoria: true, proveedor: true}
    });

}

export async function obtenerProducto(id){
    return prisma.producto.findUnique({
        where: { id},
        include: { categoria: true, proveedor:true}
    })

}

export async function CrearProducto(datos){
    const {nombre,
           proveedor_id,
           categoria_id,} = datos; 
    return prisma.producto.create({
        where: {id},
        data: {
            nombre, proveedor_id, categoria_id },
        });
}

export async function ActualizarProducto(id,datos){
const {nombre,
           proveedor_id,
           categoria_id,} = datos; 
    return prisma.producto.update({
        where:{id},  
        data:{
    nombre,proveedor_id,categoria_id
   }
})
}
export async function EliminarProducto(id){y
    return prisma.producto.update({
        where: {id},
        data:  {activo:false}
   })
}   
