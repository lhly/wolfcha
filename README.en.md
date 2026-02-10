# Wolfcha

<div align="center">
  <img src="public/logo.png" alt="Wolfcha Logo" width="240" />
  <h3>Play Werewolf with AI — Watch the Models Battle It Out</h3>
  <p>
    <a href="https://wolf-cha.com">Play Online (wolf-cha.com)</a>
  </p>
</div>

## 🙏 Sponsors

![ZenMux Banner](public/sponsor/zenmux-banner.png)

Current sponsors:

*   [ZenMux](https://zenmux.ai/invite/DMMBVZ) - Powers the core game flow, roleplay, and summary features with AI models
*   [Dashscope](https://bailian.console.aliyun.com/) - Provides additional AI model support
*   [OpenCreator](https://opencreator.io?promo=wolfcha) - Generates AI character portraits

---

> **Note**: This project was born at the **"Guancha + ModelScope Global Hackathon"** as an AI-native game.
> 
> "Wolfcha" combines Wolf (Werewolf) + Cha (猹, a character from Chinese literature). It's a nod to the hackathon host while also capturing the fun of watching AI characters interact — like spectating a show.

## 📖 Background

After graduating, getting 8-12 people together for a proper Werewolf game became nearly impossible. While Werewolf is fundamentally a social game, its core appeal — logical deduction, verbal sparring, and reading between the lines — remains captivating even without the social element.

To enjoy Werewolf anytime, anywhere, we built this **AI-powered version**. As the name suggests, every player except you (Seer, Witch, Hunter, Guard, Werewolves, etc.) is controlled by AI.

## ✨ Core Features

### 1. Dual-Layer AI Roleplay
Thanks to the growing context windows and instruction-following capabilities of large language models (LLMs), we've implemented a sophisticated dual-layer roleplay system:
*   **Layer 1**: The AI plays a "virtual player" with a unique personality and background.
*   **Layer 2**: This virtual player then takes on a Werewolf role (e.g., Seer) and speaks, bluffs, and reasons based on the game state.

Every conversation is generated in real-time, full of unpredictability and fun.

### 2. Bring Your Own AI Model
**Configure any OpenAI-compatible endpoint with your own API key.**

Wolfcha now runs locally with a BaseUrl + API Key + Model you provide. Multi‑model “arena” support can be added later; for now, it’s single‑model gameplay with your chosen endpoint.

Example models you can use (depending on your provider):
*   **DeepSeek V3.2**
*   **Qwen3-235B-A22B**
*   **Kimi K2**
*   **Gemini 3 Flash**
*   **Seed 1.8 (ByteDance)**

<div align="center">
  <img src="https://img.shields.io/badge/DeepSeek-V3.2-1B75FF?style=for-the-badge" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/Qwen-Qwen3-5A6CFF?style=for-the-badge" alt="Qwen" />
  <img src="https://img.shields.io/badge/Moonshot%20AI-Kimi-111111?style=for-the-badge" alt="Kimi" />
  <br/>
  <img src="https://img.shields.io/badge/ByteDance-Seed-333333?style=for-the-badge" alt="Seed" />
</div>

### 3. Immersive Retro Experience
While we don't have a professional art team, we've crafted a polished UI/UX:
*   **Retro Design Style**: Clean layouts with vintage color palettes.
*   **Dynamic Interactions**:
    *   Eye-blink transitions for day/night changes.
    *   Character lip-sync animations during speech.
    *   Unique character portraits for special roles during night actions.

## 🧭 Roadmap

We're continuing to improve:
*   **Mobile Optimization**: Play seamlessly on any device.
*   **Flexible Player Count**: Support 8-12 player custom games.
*   **Post-Game Review / Chat**: Reflect on strategies and memorable moments.
*   **Special Abilities**: Unique mechanics like time rewind and AI insight.
*   **Custom Model Selection**: Choose which AI models join your game.
*   **Multiplayer Mode**: Play with friends alongside AI characters.
*   **Character Ratings**: Upvote standout personalities/models to find the best Werewolf players.

## 🛠️ Tech Stack

Built with modern web technologies:

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
*   **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
*   **State Management**: [Jotai](https://jotai.org/) 
*   **Editor**: [Tiptap](https://tiptap.dev/) (For rich text interactions)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
*   **Avatar Generation**: [DiceBear](https://www.dicebear.com/) (Notionists style)
*   **AI Integration**: OpenAI-compatible endpoints (bring your own BaseUrl + API key)

## 🚀 Local Development

To run this project locally:

1.  **Clone the repository**

```bash
git clone https://github.com/oil-oil/wolfcha.git
cd wolfcha
```

2.  **Install dependencies**

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

3.  **Configure model settings**

Start the app, open **Model Settings**, then fill in your **BaseUrl**, **API Key**, and **Model** (OpenAI‑compatible).

Optional: create a local env file if you need TTS or other server features.

```bash
cp .env.example .env.local
```

4.  **Start the development server**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📄 License

MIT
