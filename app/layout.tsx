import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "iExam - 智能模拟考试系统",
    description: "基于 Next.js 的在线考试与练习系统",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh">
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
                    integrity="sha384-GvrOXuhMATgEsSwCs4smis94qD779jE8UEZ09yWubqGDP25LMXTdkGi3Z3xePX7X"
                    crossOrigin="anonymous"
                />
            </head>
            <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col`}>
                <Navbar />
                <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>
            </body>
        </html>
    );
}
