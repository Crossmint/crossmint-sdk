import { Toaster } from "react-hot-toast";

import { AppProvider } from "./AppContext";
import { AppRouter } from "./Router";
import { withProviders } from "./providers/Providers";

function App() {
    return (
        <AppProvider>
            <>
                <Toaster position="top-right" />
                <AppRouter />
            </>
        </AppProvider>
    );
}

export default withProviders(App);
