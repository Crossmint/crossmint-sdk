import { test, expect } from '@playwright/test';
import { createAAWalletHelper } from '../functions/Utils';
import { CrossmintAASDK } from "@crossmint/client-sdk-aa";
import { BlockchainIncludingTestnet } from '@crossmint/common-sdk-base';


test.describe('get or created wallet', () => {
  test('with the correct parameter, creates the wallet succesfully', async ({page}) => {
      await page.goto('https://scw-demo-xi.vercel.app/mint');
      const wallet = await createAAWalletHelper();
      console.log(wallet);
  });
 /* test.only('with the correct parameter, creates the wallet succesfully', async ({page}) => {
   // await page.addScriptTag({ url: 'https://cdn.example.com/crossmintAASDK.js' });
    const walletCreatedOrRetrieved = await page.evaluate(async () => {
      const xm = window.CrossmintAASDK.init({
        apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
      });

      const userIdentifier = { email: "test@example.com" };
      const wallet = await xm.getOrCreateWallet(userIdentifier, BlockchainIncludingTestnet.MUMBAI, {});
      
      return wallet !== null;
    });

    expect(walletCreatedOrRetrieved).toBeTruthy();

});
/*test.skip('with the correct parameter, creates the wallet succesfully', async ({page}) => {
    // Llama a la función fuera de page.evaluate y guarda el resultado
    const wallet = await createAAWalletHelper();

    await page.evaluate((walletData) => {
        // Usa walletData dentro de la página si es necesario
        console.log(walletData);
        // Aquí puedes interactuar con la página utilizando los datos de la wallet
    }, wallet);
 });*/
 /* test.skip('with the correct parameter, creates the wallet succesfully', async ({page}) => {
    await page.evaluate(async () => {
      console.log(window.location.href);
      // Mockear localStorage
      const mockLocalStorage = {
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
    
      // Mockear alert
      window.alert = (message) => { console.log("Alert called with message:", message); };
      const wallet = await createAAWalletHelper();
    });
  });
*/


});





