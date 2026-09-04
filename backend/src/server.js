import express from 'express';
import cors from 'cors';
import productosrouter from "./modules/productos/productos.router.js" 




const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/productos", productosrouter)


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});  