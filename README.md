# LiftingDiaryCourse

Proyecto de formación práctica para aprender a usar **Claude Code**, desde nivel principiante hasta nivel avanzado ("de beginner a pro").

En lugar de ejercicios sueltos, el aprendizaje se apoya en un caso real: **LiftingDiary**, una aplicación de diario de entrenamiento (registro de rutinas, sesiones y progreso) construida con Next.js. La app en sí es el vehículo del curso, no el objetivo final — lo que importa es practicar sobre una base de código real (autenticación, rutas protegidas, formularios, estado, etc.) los flujos de trabajo, buenas prácticas y funcionalidades de Claude Code que se van introduciendo progresivamente a lo largo de las distintas fases del curso.

**Stack técnico:**
- [Next.js 16](https://nextjs.org) (App Router)
- [Clerk](https://clerk.com) para autenticación
- TypeScript en modo estricto
- Tailwind CSS v4

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
