import { listarProductos,obtenerProducto,crearProducto,eliminarProducto, actualizarProducto } from './productos.service.js'

export async function listar(req, res) {
  const datos = await listarProductos();
  res.json(datos);
}

export async function obtener(req,res){
    const datos = await obtenerProducto(Number(req.params.id));
     if(!datos){
     return res.status(404).json({error: "Producto no encontrado"});
    }
    res.json(datos);
}

export async function crear(req,res){
    const datos = await crearProducto(req.body);
    res.status(201).json(datos);
}

export async function eliminar(req,res){
    const datos = await eliminarProducto(Number(req.params.id));
     if(!datos){
     return res.status(404).json({error: "Producto no encontrado"});
    }
    res.json(datos);
}
export async function actualizar(req,res){
    const datos = await actualizarProducto(Number(req.params.id),req.body);
     if(!datos){
     return res.status(404).json({error: "Producto no encontrado"});
    }
    res.json(datos);
}