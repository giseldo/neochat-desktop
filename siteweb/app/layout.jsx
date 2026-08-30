import './globals.css';

export const metadata = {
  title: 'NeoChat Web — Workspace de IA Universal & Multi-Provedor (BYOK)',
  description: 'Converse com Groq, OpenAI, Anthropic, Gemini, DeepSeek e Mistral diretamente no navegador com Bring Your Own Key (BYOK), Markdown, LaTeX e zero instalação.',
  icons: {
    icon: '/icon.png',
  },
  openGraph: {
    title: 'NeoChat Web — Workspace de IA Universal',
    description: 'Acesse modelos de ponta com sua própria chave de API (BYOK), suporte a LaTeX, Markdown e streaming veloz.',
    url: 'https://neochatweb.vercel.app',
    siteName: 'NeoChat Web',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-blue-600/30 selection:text-blue-200">
        {children}
      </body>
    </html>
  );
}
