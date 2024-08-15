import { Toaster } from "react-hot-toast";

import { AppProvider } from "./AppContext";
import { AppRouter } from "./Router";
import { ConfiguredAuthProviders } from "./providers/auth-providers";

function App() {
    return (
        <AppProvider>
            <ConfiguredAuthProviders>
                <>
                    <Toaster position="top-right" />
                    <AppRouter />
                </>
            </ConfiguredAuthProviders>
        </AppProvider>
    );
}

export default App;
