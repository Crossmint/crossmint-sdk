import { useEffect, useState } from "react";
import "@crossmint/client-sdk-vanilla-ui";

function App() {
    const [theme, setTheme] = useState('dark');
    useEffect(() => {
        setTimeout(() => {
            // This does not work
            setTheme('light');
            console.log('me cambo');
        }, 4000);
    });
    return (
        <div
            style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}
        >
            <crossmint-pay-button theme={theme}></crossmint-pay-button>
            
        </div>
    );
}

export default App;
