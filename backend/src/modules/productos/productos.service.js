import {prisma } from  "../../shared/prisma.js";

export async function listarProductos() {
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

export async function crearProducto(datos){
    const {nombre,
           proveedor_id,
           categoria_id,} = datos; 
    return prisma.producto.create({
        data: {
            nombre, proveedor_id, categoria_id },
        });
}

export async function actualizarProducto(id,datos){
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
export async function eliminarProducto(id){
    return prisma.producto.update({
        where: {id},
        data:  {activo:false}
   })
}   
