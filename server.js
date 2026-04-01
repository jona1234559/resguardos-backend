const express = require("express");
const axios = require("axios");
const cors = require("cors");
const session = require("express-session");

const app = express();

app.use(cors({
  origin: "https://eloquent-salamander-38bf24.netlify.app",
  credentials: true
}));
app.use(express.json());

app.use(session({
  secret: "resguardo-sistemas",
  resave: false,
  saveUninitialized: true,
  cookie: {
  secure: true,
  sameSite: "lax"
}
}));

app.use(express.static(__dirname));

/* LOGIN PAGE */

app.get("/", (req,res)=>{

  if(!req.session.auth){
    return res.sendFile(__dirname + "/index.html");
  }

  res.sendFile(__dirname + "/talacha.html");

});

/* LOGIN USERS */

const USERS = {
  admin: "1234", sistemas: "copexa2026", oscarin: "pollocrudo"
};

/* LOGIN ENDPOINT */

app.post("/login",(req,res)=>{

  const {usuario,password} = req.body;

  if(USERS[usuario] && USERS[usuario] === password){

    req.session.auth = true;

    return res.json({success:true});

  }

  res.json({success:false});

});

/* AUTH MIDDLEWARE */

function verificarAuth(req,res,next){

  if(req.session.auth){
    return next();
  }

  res.status(401).json({error:"No autorizado"});

}

/* FRESHSERVICE CONFIG */

const API_KEY = "I4o9hcxJSlSNXCzvlS6";
const DOMAIN = "operadoraautopistaperote-x.freshservice.com";

const AUTH = Buffer.from(`${API_KEY}:X`).toString("base64");

/* BUSCAR USUARIO */

app.get("/buscar/:nombre", verificarAuth, async (req,res)=>{

  const nombre = req.params.nombre.toLowerCase();

  try {

    const response = await axios.get(
      `https://${DOMAIN}/api/v2/requesters?per_page=100`,
      {
        headers:{
          "Authorization": `Basic ${AUTH}`,
          "Content-Type": "application/json"
        }
      }
    );

    const usuarios = response.data.requesters || [];

    const usuario = usuarios.find(u => {

      const nombreCompleto = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
      const correo = (u.primary_email || "").toLowerCase();

      return nombreCompleto.includes(nombre) || correo.includes(nombre);

    });

    if(!usuario){
      return res.json({error:"Usuario no encontrado"});
    }

    const assets = await axios.get(
      `https://${DOMAIN}/api/v2/assets?query="user_id:${usuario.id}"`,
      {
        headers:{
          "Authorization": `Basic ${AUTH}`,
          "Content-Type": "application/json"
        }
      }
    );

    const equipos = [];

    for (const a of assets.data.assets) {

      const detalle = await axios.get(
        `https://${DOMAIN}/api/v2/assets/${a.display_id}?include=type_fields`,
        {
          headers:{
            "Authorization": `Basic ${AUTH}`,
            "Content-Type": "application/json"
          }
        }
      );

      const asset = detalle.data.asset;

      equipos.push({
        nombre: asset.name,
        asset_tag: asset.asset_tag,
        serie: asset.type_fields?.numero_de_serie_31001116089 || "N/A",
        modelo: asset.type_fields?.modelo_31001116089 || "N/A"
      });

    }

    res.json({
      usuario: `${usuario.first_name} ${usuario.last_name}`,
      puesto: usuario.job_title,
      correo: usuario.primary_email,
      ubicacion: usuario.location_name,
      equipos
    });

  } catch (error) {

    console.log("ERROR COMPLETO");

    if(error.response){
      console.log(error.response.status);
      console.log(error.response.data);
    }else{
      console.log(error.message);
    }

    res.status(500).json("Error consultando Freshservice");

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
  console.log("API corriendo");
});