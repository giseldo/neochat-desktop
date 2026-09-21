"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../neo-chat/src/config/plugins.ts
var plugins_exports = {};
__export(plugins_exports, {
  AGNES_IMAGE_PLUGIN: () => AGNES_IMAGE_PLUGIN,
  AGNES_VIDEO_PLUGIN: () => AGNES_VIDEO_PLUGIN,
  BUILT_IN_PLUGINS: () => BUILT_IN_PLUGINS,
  GEMINI_IMAGE_PLUGIN: () => GEMINI_IMAGE_PLUGIN,
  JINA_READER_PLUGIN: () => JINA_READER_PLUGIN,
  OPENAI_IMAGE_PLUGIN: () => OPENAI_IMAGE_PLUGIN,
  OPENAI_RESPONSES_IMAGE_PLUGIN: () => OPENAI_RESPONSES_IMAGE_PLUGIN,
  PLUGIN_CATEGORIES: () => PLUGIN_CATEGORIES,
  UNSPLASH_PLUGIN: () => UNSPLASH_PLUGIN,
  WEATHER_PLUGIN: () => WEATHER_PLUGIN,
  getPluginById: () => getPluginById,
  getPluginsByCategory: () => getPluginsByCategory
});
module.exports = __toCommonJS(plugins_exports);

// ../neo-chat/src/lib/plugin/researchSources/catalog.ts
var RESEARCH_SOURCE_IDS = [
  "arxiv",
  "pubmed",
  "epo-ops",
  "sec-edgar"
];
var RESEARCH_SOURCE_FUNCTIONS = {
  arxiv: { search: "search_arxiv", read: "read_arxiv" },
  pubmed: { search: "search_pubmed", read: "read_pubmed" },
  "epo-ops": { search: "search_patents", read: "read_patent" },
  "sec-edgar": { search: "search_filings", read: "read_filing" }
};
var stringField = (description, maxLength = 500) => ({
  type: "string",
  minLength: 1,
  maxLength,
  description
});
var commonSearch = {
  query: stringField(
    "Search expression. SEC: company name, ticker, or CIK. EPO: CQL expression such as ti=solar."
  ),
  limit: { type: "integer", minimum: 1, maximum: 20, default: 5 },
  dateFrom: {
    type: "string",
    pattern: "^\\d{4}-\\d{2}-\\d{2}$",
    description: "Earliest publication or filing date (inclusive)."
  },
  dateTo: {
    type: "string",
    pattern: "^\\d{4}-\\d{2}-\\d{2}$",
    description: "Latest publication or filing date (inclusive)."
  }
};
var details = {
  arxiv: {
    title: "arXiv",
    description: "Search preprints and read versioned abstracts and bibliographic metadata.",
    url: "https://export.arxiv.org",
    docs: "https://info.arxiv.org/help/api/user-manual.html",
    idHelp: "arXiv identifier, preferably including a version, e.g. 2401.12345v2 or hep-th/9901001v1.",
    auth: { type: "none" }
  },
  pubmed: {
    title: "PubMed",
    description: "Search biomedical literature and read PubMed abstracts and publication records.",
    url: "https://eutils.ncbi.nlm.nih.gov",
    docs: "https://dataguide.nlm.nih.gov/eutilities/utilities.html",
    idHelp: "PubMed numeric PMID.",
    auth: { type: "apiKey", name: "api_key", in: "query", required: false }
  },
  "epo-ops": {
    title: "EPO OPS",
    description: "Search worldwide patents and read public bibliographic records and available abstracts.",
    url: "https://ops.epo.org",
    docs: "https://developers.epo.org/",
    idHelp: "DOCDB publication identifier returned by search, e.g. EP.1000000.A1.",
    auth: { type: "oauth2", required: true }
  },
  "sec-edgar": {
    title: "SEC EDGAR",
    description: "Find company filings by name, ticker or CIK and read the primary filing document.",
    url: "https://www.sec.gov",
    docs: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
    idHelp: "Exact filing ID returned by search: CIK/accession-number/filing-date/primary-document.htm.",
    auth: { type: "apiKey", name: "User-Agent", in: "header", required: true }
  }
};
var RESEARCH_SOURCE_PLUGINS = RESEARCH_SOURCE_IDS.map(
  (id) => {
    const d = details[id];
    return {
      id,
      title: d.title,
      description: d.description,
      logoUrl: `${d.url}/favicon.ico`,
      manifestUrl: d.docs,
      externalDocsUrl: d.docs,
      baseUrl: d.url,
      source: "builtin",
      builtIn: true,
      category: "research",
      auth: d.auth,
      functions: [
        {
          name: RESEARCH_SOURCE_FUNCTIONS[id].search,
          description: `${d.description} Search returns discovery records only; call the corresponding read tool before using a document as evidence. SEC coverage is bounded to the company's available recent and historical filing indexes.`,
          method: "GET",
          path: "/research/search",
          risk: "read",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              ...commonSearch,
              ...id === "sec-edgar" ? {
                form: stringField(
                  "Optional exact filing form, e.g. 10-K, 10-Q, 8-K.",
                  30
                )
              } : {}
            },
            required: ["query"]
          }
        },
        {
          name: RESEARCH_SOURCE_FUNCTIONS[id].read,
          description: `${d.idHelp} Read returns the actual available content with coverage and truncation labels; no PDF or paywalled full-text access.`,
          method: "GET",
          path: "/research/read",
          risk: "read",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: { id: stringField(d.idHelp, 240) },
            required: ["id"]
          }
        }
      ]
    };
  }
);

// ../neo-chat/src/config/plugins.ts
var ImageCountSchema = {
  type: "integer",
  minimum: 1,
  maximum: 10,
  description: "Optional number of images to generate when supported by the selected model."
};
var JinaReaderSchema = {
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "The full URL of the webpage to read (e.g., https://example.com)"
    }
  },
  required: ["url"]
};
var WeatherSchema = {
  type: "object",
  properties: {
    location: {
      type: "string",
      description: 'The city name to get weather for (e.g. "New York", "Shanghai"). Only English place names are allowed.'
    }
  },
  required: ["location"]
};
var UnsplashSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: 'The search terms (English only, e.g. "nature", "cats").'
    },
    page: {
      type: "integer",
      description: "Page number to retrieve. Default is 1."
    },
    per_page: {
      type: "integer",
      description: "Number of items per page. Default is 10."
    }
  },
  required: ["query"]
};
var AgnesImageSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Text instruction for image generation or image editing."
    },
    size: {
      type: "string",
      description: 'Output image size, such as "1024x768".'
    },
    model: {
      type: "string",
      description: 'Optional Agnes image model. Defaults to "agnes-image-2.1-flash".'
    },
    n: ImageCountSchema,
    image: {
      type: "array",
      items: { type: "string" },
      description: "Optional input image URLs or Data URI Base64 values for image-to-image generation."
    },
    return_base64: {
      type: "boolean",
      description: "Return text-to-image output as Base64 data."
    },
    response_format: {
      type: "string",
      enum: ["url", "b64_json"],
      description: "Output format. This is sent as extra_body.response_format."
    }
  },
  required: ["prompt", "size"]
};
var GeminiImageSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Text instruction for Gemini image generation or editing."
    },
    model: {
      type: "string",
      description: 'Optional Gemini image model. Defaults to "gemini-3.1-flash-image".'
    },
    aspect_ratio: {
      type: "string",
      enum: [
        "1:1",
        "2:3",
        "3:2",
        "3:4",
        "4:3",
        "4:5",
        "5:4",
        "9:16",
        "16:9",
        "21:9"
      ],
      description: 'Optional output aspect ratio, such as "1:1" or "16:9".'
    },
    image_size: {
      type: "string",
      enum: ["1K", "2K", "4K", "512"],
      description: 'Optional output size tier, such as "1K" or "2K".'
    },
    n: ImageCountSchema,
    image: {
      type: "array",
      items: { type: "string" },
      description: "Optional input image URLs or data URLs for image-to-image editing."
    }
  },
  required: ["prompt"]
};
var OpenAIResponsesImageSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Text instruction for image generation or image editing."
    },
    model: {
      type: "string",
      description: 'Main Responses model. Defaults to "gpt-5.5".'
    },
    image_model: {
      type: "string",
      description: 'Optional GPT image tool model, such as "gpt-image-1.5".'
    },
    action: {
      type: "string",
      enum: ["auto", "generate", "edit"],
      description: "Whether the image tool should generate, edit, or let the model decide."
    },
    size: {
      type: "string",
      description: 'Optional output size, such as "1024x1024".'
    },
    quality: {
      type: "string",
      enum: ["auto", "low", "medium", "high"],
      description: "Optional image generation quality."
    },
    background: {
      type: "string",
      enum: ["auto", "transparent", "opaque"],
      description: "Optional generated image background."
    },
    image: {
      type: "array",
      items: { type: "string" },
      description: "Optional input image URLs or data URLs for image-to-image editing."
    }
  },
  required: ["prompt"]
};
var OpenAICompatibleImageSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Text instruction for image generation or image editing."
    },
    model: {
      type: "string",
      description: 'Image model name. Defaults to "gpt-image-1".'
    },
    size: {
      type: "string",
      description: 'Optional output image size, such as "1024x1024".'
    },
    n: {
      ...ImageCountSchema
    },
    image: {
      type: "array",
      items: { type: "string" },
      description: "Optional input images as data URLs. When present, the plugin calls /images/edits."
    },
    response_format: {
      type: "string",
      enum: ["url", "b64_json"],
      description: "Optional Images API response format for compatible providers that support it."
    }
  },
  required: ["prompt"]
};
var AgnesVideoCreateSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Text description of the video content."
    },
    model: {
      type: "string",
      description: 'Optional Agnes video model. Defaults to "agnes-video-v2.0".'
    },
    image: {
      type: "string",
      description: "Optional publicly accessible HTTPS image URL for image-to-video workflows."
    },
    mode: {
      type: "string",
      description: 'Optional generation mode, such as "ti2vid".'
    },
    height: {
      type: "integer",
      description: "Video height. Default is 768."
    },
    width: {
      type: "integer",
      description: "Video width. Default is 1152."
    },
    num_frames: {
      type: "integer",
      description: "Number of frames. Must be <= 441 and follow the 8n + 1 rule."
    },
    frame_rate: {
      type: "number",
      description: "Frame rate from 1 to 60."
    },
    num_inference_steps: {
      type: "integer",
      description: "Number of inference steps."
    },
    seed: {
      type: "integer",
      description: "Random seed for reproducible results."
    },
    negative_prompt: {
      type: "string",
      description: "Negative prompt describing content to avoid."
    },
    extra_body: {
      type: "object",
      description: "Optional advanced parameters, including image arrays and keyframe mode."
    }
  },
  required: ["prompt"]
};
var AgnesVideoResultSchema = {
  type: "object",
  properties: {
    video_id: {
      type: "string",
      description: "Recommended video ID returned by create_video. Use this to retrieve the current generation status or final video URL."
    },
    task_id: {
      type: "string",
      description: "Legacy task ID returned by create_video. Use only when video_id is not available."
    },
    model_name: {
      type: "string",
      description: "Optional Agnes video model name for video_id result lookups, especially when using a custom video model."
    }
  },
  anyOf: [{ required: ["video_id"] }, { required: ["task_id"] }]
};
var JINA_READER_PLUGIN = {
  id: "jina-web-reader",
  title: "Web Reader (Jina AI)",
  description: "Converts any URL into LLM-friendly markdown content. Useful for reading documentation, articles, or any webpage context.",
  logoUrl: "https://jina.ai/icons/favicon-128x128.png",
  manifestUrl: "",
  baseUrl: "https://r.jina.ai",
  category: "Utilities",
  builtIn: true,
  added: (/* @__PURE__ */ new Date()).toISOString(),
  functions: [
    {
      name: "read_webpage",
      description: "Reads the content of a specific webpage URL and returns it as clean markdown.",
      method: "GET",
      path: "/{url}",
      parameters: JinaReaderSchema
    }
  ],
  auth: { type: "bearer", required: false }
};
var WEATHER_PLUGIN = {
  id: "weather-gpt",
  title: "Real-time Weather",
  description: "Get real-time weather information including temperature, conditions, and humidity for any city.",
  logoUrl: "https://cdn.weatherapi.com/v4/images/weatherapi_logo.png",
  manifestUrl: "https://openai-collections.chat-plugin.lobehub.com/weather-gpt/openapi.json",
  baseUrl: "https://weathergpt.vercel.app",
  category: "Utilities",
  builtIn: true,
  added: (/* @__PURE__ */ new Date()).toISOString(),
  functions: [
    {
      name: "getCurrentWeather",
      description: "Get the current weather for a specific city.",
      method: "GET",
      path: "/api/weather",
      parameters: WeatherSchema
    }
  ],
  auth: { type: "none" }
};
var UNSPLASH_PLUGIN = {
  id: "unsplash",
  title: "Unsplash",
  description: "Search for high-quality photos on Unsplash.",
  logoUrl: "https://unsplash.com/apple-touch-icon.png",
  manifestUrl: "",
  baseUrl: "https://api.unsplash.com",
  category: "Image Search",
  builtIn: true,
  added: (/* @__PURE__ */ new Date()).toISOString(),
  functions: [
    {
      name: "search_photos",
      description: "Search photos on Unsplash.",
      method: "GET",
      path: "/search/photos",
      parameters: UnsplashSchema
    }
  ],
  auth: {
    type: "apiKey",
    name: "client_id",
    in: "query"
  }
};
var AGNES_IMAGE_PLUGIN = {
  id: "agnes-image-generation",
  title: "Agnes Image Processing",
  description: "Generate or edit images with Agnes Image 2.1 Flash from text prompts or input images.",
  logoUrl: "https://agnes-ai.com/images/logo.png",
  manifestUrl: "",
  externalDocsUrl: "https://agnes-ai.com/en/docs/agnes-image-21-flash",
  baseUrl: "https://apihub.agnes-ai.com",
  category: "Image Processing",
  builtIn: true,
  added: (/* @__PURE__ */ new Date()).toISOString(),
  functions: [
    {
      name: "generate_image",
      description: "Generate or edit an image with Agnes Image 2.1 Flash. Requires an Agnes AI API key.",
      method: "POST",
      path: "/v1/images/generations",
      parameters: AgnesImageSchema
    }
  ],
  auth: {
    type: "bearer",
    required: true
  }
};
var GEMINI_IMAGE_PLUGIN = {
  id: "gemini-image-generation",
  title: "Gemini Image Processing",
  description: "Generate or edit images with Gemini Nano Banana image models.",
  logoUrl: "https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg",
  manifestUrl: "",
  externalDocsUrl: "https://ai.google.dev/gemini-api/docs/image-generation",
  baseUrl: "https://generativelanguage.googleapis.com",
  category: "Image Processing",
  builtIn: true,
  added: (/* @__PURE__ */ new Date()).toISOString(),
  functions: [
    {
      name: "generate_gemini_image",
      description: "Generate or edit an image with Gemini Nano Banana. Requires a Gemini API key.",
      method: "POST",
      path: "/v1beta/interactions",
      parameters: GeminiImageSchema
    }
  ],
  auth: {
    type: "apiKey",
    name: "x-goog-api-key",
    in: "header",
    required: true
  }
};
var OPENAI_IMAGE_PLUGIN = {
  id: "openai-image-generation",
  title: "OpenAI-compatible Image Processing",
  description: "Generate or edit images with OpenAI-compatible Images API providers.",
  logoUrl: "https://openai.com/favicon.ico",
  manifestUrl: "",
  externalDocsUrl: "https://developers.openai.com/api/docs/guides/image-generation",
  baseUrl: "https://api.openai.com/v1",
  category: "Image Processing",
  builtIn: true,
  added: (/* @__PURE__ */ new Date()).toISOString(),
  functions: [
    {
      name: "generate_image_with_images_api",
      description: "Generate or edit an image using an OpenAI-compatible Images API endpoint configured in plugin settings. Requires an API key.",
      method: "POST",
      path: "/images/generations",
      parameters: OpenAICompatibleImageSchema
    }
  ],
  auth: {
    type: "bearer",
    required: true
  }
};
var OPENAI_RESPONSES_IMAGE_PLUGIN = {
  id: "openai-responses-image-processing",
  title: "OpenAI Responses Image Processing",
  description: "Generate or edit images with the OpenAI Responses API image_generation tool.",
  logoUrl: "https://openai.com/favicon.ico",
  manifestUrl: "",
  externalDocsUrl: "https://developers.openai.com/api/docs/guides/image-generation",
  baseUrl: "https://api.openai.com/v1",
  category: "Image Processing",
  builtIn: true,
  added: (/* @__PURE__ */ new Date()).toISOString(),
  functions: [
    {
      name: "generate_image_with_responses",
      description: "Generate or edit an image using the OpenAI Responses API image_generation tool. Requires an OpenAI API key.",
      method: "POST",
      path: "/responses",
      parameters: OpenAIResponsesImageSchema
    }
  ],
  auth: {
    type: "bearer",
    required: true
  }
};
var AGNES_VIDEO_PLUGIN = {
  id: "agnes-video-generation",
  title: "Agnes Video Generation",
  description: "Create text-to-video or image-to-video tasks with Agnes Video V2.0, then retrieve generated results.",
  logoUrl: "https://agnes-ai.com/images/logo.png",
  manifestUrl: "",
  externalDocsUrl: "https://agnes-ai.com/en/docs/agnes-video-v20",
  baseUrl: "https://apihub.agnes-ai.com",
  category: "Video Generation",
  builtIn: true,
  added: (/* @__PURE__ */ new Date()).toISOString(),
  functions: [
    {
      name: "create_video",
      description: "Create an asynchronous Agnes Video V2.0 text-to-video or image-to-video generation task. Requires an Agnes AI API key.",
      method: "POST",
      path: "/v1/videos",
      parameters: AgnesVideoCreateSchema
    },
    {
      name: "get_video_result",
      description: "Retrieve an Agnes Video V2.0 generation status or result by video_id, or by legacy task_id when video_id is unavailable.",
      method: "GET",
      path: "/agnesapi",
      parameters: AgnesVideoResultSchema
    }
  ],
  auth: {
    type: "bearer",
    required: true
  }
};
var BUILT_IN_PLUGINS = [
  ...RESEARCH_SOURCE_PLUGINS,
  JINA_READER_PLUGIN,
  WEATHER_PLUGIN,
  UNSPLASH_PLUGIN,
  AGNES_IMAGE_PLUGIN,
  GEMINI_IMAGE_PLUGIN,
  OPENAI_IMAGE_PLUGIN,
  OPENAI_RESPONSES_IMAGE_PLUGIN,
  AGNES_VIDEO_PLUGIN
];
var PLUGIN_CATEGORIES = {
  research: "Research",
  utilities: "Utilities",
  imageSearch: "Image Search",
  imageProcessing: "Image Processing",
  videoGeneration: "Video Generation",
  dataRetrieval: "Data Retrieval",
  productivity: "Productivity",
  entertainment: "Entertainment"
};
function getPluginById(id) {
  return BUILT_IN_PLUGINS.find((plugin) => plugin.id === id);
}
function getPluginsByCategory(category) {
  return BUILT_IN_PLUGINS.filter((plugin) => plugin.category === category);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AGNES_IMAGE_PLUGIN,
  AGNES_VIDEO_PLUGIN,
  BUILT_IN_PLUGINS,
  GEMINI_IMAGE_PLUGIN,
  JINA_READER_PLUGIN,
  OPENAI_IMAGE_PLUGIN,
  OPENAI_RESPONSES_IMAGE_PLUGIN,
  PLUGIN_CATEGORIES,
  UNSPLASH_PLUGIN,
  WEATHER_PLUGIN,
  getPluginById,
  getPluginsByCategory
});
