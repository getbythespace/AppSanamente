// filepath: c:\Users\pvall\Desktop\appSanamente\src\components\Layout.tsx

import React, { ReactNode } from 'react';
import Head from 'next/head';

type Props = {
  children?: ReactNode;
  title?: string;
};

const Layout = ({ children, title = 'App Sanamente' }: Props) => (
  <div>
    <Head>
      <title>{title}</title>
      <meta charSet="utf-8" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
    </Head>
    <header className="bg-blue-600 text-white p-4 shadow-md">
      <nav className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">App Sanamente</h1>
        {/* ENLACES DE NAVEGACIÓN */}
      </nav>
    </header>
    <main className="container mx-auto p-4 min-h-screen">
      {children}
    </main>
    <footer className="bg-gray-800 text-white text-center p-4 mt-auto">
      <p>&copy; {new Date().getFullYear()} App Sanamente. Todos los derechos reservados.</p>
    </footer>
  </div>
);

export default Layout;