"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {/* Video Background */}
      <video
        autoPlay
        muted
        playsInline
        className="absolute top-0 left-0 h-full w-full object-cover"
      >
        <source
          src="/CasaCincoDeMayoLanding.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* Overlay */}
      <div className="absolute top-0 left-0 h-full w-full bg-black/40" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {/* Logo Placeholder */}
          <h1 className="mb-4 text-5xl font-serif tracking-widest text-white md:text-7xl">
            CASA CINCO DE MAYO
          </h1>
          
          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
            className="text-lg font-light tracking-widest text-white/90 md:text-xl uppercase"
          >
            San Miguel de Allende
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="mt-12 border-t border-white/30 pt-6"
          >
            <p className="text-sm font-medium tracking-widest text-white uppercase">
              Próximamente
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
