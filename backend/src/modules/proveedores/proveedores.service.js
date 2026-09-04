import { prisma } from  "../../shared/prisma.js";

export async function crearProveedor(datos){
const {nombre,Nit,telefono,correo, } = datos
  return prisma.proveedor.create({
     data: {nombre,Nit,telefono,correo}
  })
}

export async function obtenerProveedorDetallado(id){
return prisma.proveedor.findUnique({
    where: {id, activo:true},
    include: {producto:true, orden:true }
})
}

export async function obtenerProveedor(id){
return prisma.proveedor.findUnique({
    where: {id, activo:true},
})
}

export async function listarProveedores(){
return prisma.proveedor.findMany({
    where: {activo:true},
})
}

export async function actualizarProveedor(id,datos){
const {nombre,Nit,telefono,correo, } = datos
    return prisma.proveedor.update({
    where: {id, activo:true},
   data: {nombre,Nit,telefono,correo}
})
}

export async function eliminarProveedor(id){
    return prisma.proveedor.update({
    where: {id,activo:true},
   data: {activo:false}
})
}