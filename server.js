// server.js
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // CORREGIDO: Es GoogleGenerativeAI
require("dotenv").config();

// 1. Importar la configuración del Agente - CORREGIDO
const { agentConfig } = require("./context");

const app = express();
const PORT = process.env.PORT || 3000;

// Inicialización de la IA con la clave del .env
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    "ERROR: GEMINI_API_KEY no encontrada en .env. Por favor, revísela."
  );
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey); // CORREGIDO: Usar GoogleGenerativeAI

// Middleware
app.use(cors());
app.use(express.json());

// ** LOG DE VERIFICACIÓN **
console.log(`INFO: Modelo de IA cargado: ${agentConfig.model}`);

// ===============================================
// ENDPOINT: Health Check (GET /)
// ===============================================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Servidor del Agente FAQ desplegado correctamente.",
    api_version: "v1",
    agent: "Charly, Asistente TechFuture Software",
    modelo: agentConfig.model,
  });
});

// ===============================================
// ENDPOINT PRINCIPAL: Agente IA (POST /api/ask)
// ===============================================
app.post("/api/ask", async (req, res) => {
  const { question } = req.body;

  if (!question || question.trim() === "") {
    console.warn("ADVERTENCIA: Petición sin pregunta.");
    return res
      .status(400)
      .json({ error: "Por favor, proporciona una pregunta." });
  }

  const userQuestion = question.trim();
  console.log(
    `[REQUEST] Pregunta recibida: "${userQuestion.substring(0, 100)}..."`
  );

  try {
    // 2. Configurar el modelo con el systemInstruction
    const model = genAI.getGenerativeModel({
      model: agentConfig.model,
      systemInstruction: agentConfig.systemPrompt,
    });

    // 3. Configuración de generación
    const generationConfig = {
      temperature: agentConfig.temperature,
      maxOutputTokens: agentConfig.maxTokens,
    };

    // 4. Generar contenido
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userQuestion }] }],
      generationConfig,
    });

    const response = await result.response;
    const answer = response.text();

    // ** LOG DE RESPUESTA DE LA IA **
    console.log(
      `[RESPONSE] Respuesta generada: "${answer.substring(0, 100)}..."`
    );

    res.json({ answer: answer });
  } catch (error) {
    console.error("Error al comunicarse con la API de Gemini:", {
      message: error.message,
      model: agentConfig.model,
      stack: error.stack,
    });

    // Respuesta de fallback más informativa
    const fallbackResponse =
      "Disculpa, estoy teniendo dificultades técnicas en este momento. Por favor, contáctanos directamente por WhatsApp al +54 11 3364-9070 o por email a info@techfuture.com para una respuesta inmediata.";

    res.status(500).json({
      answer: fallbackResponse,
      error: "Error en el servidor de IA",
    });
  }
});

// Endpoint para verificar la configuración
app.get("/api/config", (req, res) => {
  res.json({
    model: agentConfig.model,
    temperature: agentConfig.temperature,
    maxTokens: agentConfig.maxTokens,
    systemPromptLength: agentConfig.systemPrompt.length,
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor Express listo en http://localhost:${PORT}`);
  console.log(`✅ Modelo configurado: ${agentConfig.model}`);
  console.log(`✅ Health check: http://localhost:${PORT}/`);
  console.log(`✅ Endpoint API: POST http://localhost:${PORT}/api/ask`);
});
