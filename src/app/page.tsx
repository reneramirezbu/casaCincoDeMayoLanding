import Hero from "@/components/Hero";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-zinc-50 dark:bg-black">
      <Hero />
      
      {/* About Section */}
      <section className="w-full max-w-4xl px-8 py-24 text-center md:py-32">
        <h2 className="mb-8 text-3xl font-serif text-zinc-900 dark:text-zinc-100 md:text-4xl">
          Bienvenidos a Casa Cinco de Mayo
        </h2>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Ubicado en el corazón de San Miguel de Allende, nuestro hotel boutique ofrece una experiencia inigualable que combina la rica historia y cultura de Guanajuato con el confort moderno. Pronto abriremos nuestras puertas para brindarle una estancia inolvidable a pasos de la icónica Parroquia.
        </p>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200 py-12 text-center dark:border-zinc-800">
        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} Casa Cinco de Mayo. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Instagram
            </a>
            <a
              href="#"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Facebook
            </a>
            <a
              href="#"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
