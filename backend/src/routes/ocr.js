import { Router } from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Configuração do multer para upload de imagens
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'), false);
    }
  }
});

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/ocr/etiqueta - Extrair dados de etiqueta via OCR
router.post('/ocr/etiqueta', upload.single('imagem'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Analise esta imagem de etiqueta de produto e extraia as seguintes informações em formato JSON:

INFORMAÇÕES PARA EXTRAIR:
- nome: Nome do produto
- sku: SKU/Código do produto
- data_validade: Data de validade (formato DD/MM/AAAA)
- lote: Número do lote
- peso: Peso do produto (em kg ou g)
- volume: Volume do produto (em ml ou L)
- codigo_barras: Código de barras (se visível)
- categoria: Categoria do produto (inferir baseado no nome)
- perecivel: true/false (baseado na presença de data de validade)

REGRAS:
1. Se alguma informação não estiver visível ou legível, retorne null
2. Para datas, use sempre o formato DD/MM/AAAA
3. Para peso e volume, extraia apenas o número e a unidade
4. Identifique se é produto perecível baseado na presença de data de validade
5. Infira a categoria baseada no nome do produto

RETORNE APENAS O JSON ESTRUTURADO, SEM TEXTO ADICIONAL:
`;

    const imageParts = [
      {
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype,
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();

    // Limpar o texto para extrair apenas o JSON
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const dadosExtraidos = JSON.parse(text);
      
      // Validar e formatar os dados
      const dadosFormatados = {
        nome: dadosExtraidos.nome || null,
        sku: dadosExtraidos.sku || null,
        data_validade: dadosExtraidos.data_validade || null,
        lote: dadosExtraidos.lote || null,
        peso: dadosExtraidos.peso || null,
        volume: dadosExtraidos.volume || null,
        codigo_barras: dadosExtraidos.codigo_barras || null,
        categoria: dadosExtraidos.categoria || 'Não identificada',
        perecivel: dadosExtraidos.perecivel || false,
        confianca: 'alta', // Pode ser implementado um sistema de confiança
        timestamp: new Date().toISOString()
      };

      res.json({
        sucesso: true,
        dados: dadosFormatados,
        mensagem: 'Dados extraídos com sucesso da etiqueta'
      });

    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      res.status(500).json({
        error: 'Erro ao processar resposta da IA',
        detalhes: text
      });
    }

  } catch (error) {
    console.error('Erro no OCR:', error);
    res.status(500).json({
      error: 'Erro ao processar imagem',
      detalhes: error.message
    });
  }
});

// GET /api/ocr/status - Verificar status do serviço OCR
router.get('/ocr/status', (req, res) => {
  res.json({
    status: 'ativo',
    servico: 'OCR de Etiquetas',
    provider: 'Google Gemini 1.5 Flash',
    formatos_suportados: ['jpg', 'jpeg', 'png', 'webp'],
    tamanho_maximo: '5MB'
  });
});

export default router;