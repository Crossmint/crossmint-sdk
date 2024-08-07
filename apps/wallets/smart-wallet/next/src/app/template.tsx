import { Header } from "@/components/header";
import { Toaster } from "@/components/toaster";

// Reference: https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts#templates
// Since our home page is located in the root directory, we cannot use a layout component to wrap it.
// This is because the root layout in nextjs is server-side only, and a couple of components are client-side (see below).
// Therefore, we are using a template component to handle client-side components and behaviors.

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <Header />
            <Toaster />
            {children}
        </div>
    );
}
