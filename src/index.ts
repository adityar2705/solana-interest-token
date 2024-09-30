//importing the necessary packages
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import {
    ExtensionType,
    getMintLen,
    TOKEN_2022_PROGRAM_ID,
    getMint,
    getInterestBearingMintConfigState,
    updateRateInterestBearingMint,
    amountToUiAmount,
    mintTo,
    createAssociatedTokenAccount,
    getAccount,
    AuthorityType,
    setAuthority,
} from "@solana/spl-token";

import { initializeKeypair, makeKeypairs } from "@solana-developers/helpers";

//import our interest bearing token helper function
import { createTokenWithInterestRateExtension } from "./token-helper.ts";

//get the getInterestBearingMint function
interface GetInterestBearingMint{
    connection : Connection,
    mint : PublicKey
}

//creating the connection objects
const connection = new Connection('http://127.0.0.1:8899', "confirmed");
const payer = await initializeKeypair(connection);
const [ otherAccount, mintKeypair ] = makeKeypairs(2);

//getting the public key of the newly created mint account keypair
const mint = mintKeypair.publicKey;
const rateAuthority = payer;
const rate = 32_767;

//create an interest-bearing token
await createTokenWithInterestRateExtension(
    connection,
    payer,
    mint,
    rateAuthority,
    rate, 
    mintKeypair
);
 
//create an associated token account for this particular mint and this payer
const payerTokenAccount = await createAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    undefined,
    TOKEN_2022_PROGRAM_ID
);
 
// Create the getInterestBearingMint function
async function getInterestBearingMint(inputs : GetInterestBearingMint){
    const { connection, mint } = inputs;

    //retrieves information of the mint
    const mintAccount = await getMint(
        connection,
        mint,
        undefined,
        TOKEN_2022_PROGRAM_ID,
    );

    //retrieves the interest rate of the mint
    const interestBearingMintConfig = await getInterestBearingMintConfigState(mintAccount);

    //returns the current interest rate
    return interestBearingMintConfig?.currentRate;
}
 
// Attempt to update the interest rate
const initialRate = await getInterestBearingMint({
    connection,
    mint
});

//try to update the interest rate using the otherAccount that we created
try{
    await updateRateInterestBearingMint(
        connection,
        payer,
        mint,
        rateAuthority,
        0, //updated rate
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
    );

    //get the new rate and compare
    const newRate = await getInterestBearingMint({connection, mint});
    
    console.log(
        `✅ - We expected this to pass because the rate has been updated. Old rate: ${initialRate}. New rate: ${newRate}`,
    );

}catch(error){
    console.log('Error has occurred : ', error);
}
 
// Attempt to update the interest rate with the incorrect owner
try{
    await updateRateInterestBearingMint(
      connection,
      otherAccount,
      mint,
      otherAccount, //incorrect authority
      0, //updated rate
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    console.log("You should be able to update the interest.");
}catch(error){
    console.error(
      `✅ - We expected this to fail because the owner is incorrect.`,
    );
}
 
//log the accrued interest
{
    //logs out interest on the token
    for(let i = 0; i<5; i++){
        const rate = await getInterestBearingMint({ connection, mint });

        //mint the tokens using Solana's mintTo function
        await mintTo(
            connection, 
            payer,
            mint,
            payerTokenAccount,
            payer,
            100,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID
        );

        //get the information about the token or basically trying to get the associated token account information -> we get the particular account and get its info
        const tokenInfo = await getAccount(
            connection,
            payerTokenAccount,
            undefined,
            TOKEN_2022_PROGRAM_ID
        );

        //convert amount to UI amount with accrued interest after getting the amount from the tokenInfo variable
        const uiAmount = await amountToUiAmount(
            connection,
            payer,
            mint,
            tokenInfo.amount,
            TOKEN_2022_PROGRAM_ID
        );

        console.log(
            `Amount with accrued interest at ${rate}: ${tokenInfo.amount} tokens = ${uiAmount}`,
        );
    }
}
 
// Log the interest-bearing mint configuration state
const mintAccount = await getMint(
    connection,
    mint,
    undefined,
    TOKEN_2022_PROGRAM_ID
);

//get interest config for this particular mint account
const interestBearingMintConfig = await getInterestBearingMintConfigState(mintAccount);
console.log(
    //just print out what we had used in the previous function as an intermediate step to see the logs
    "\nMint Config:",
    JSON.stringify(interestBearingMintConfig, null, 2),
);
 
//update the rate authority and attempt to update the interest rate with the new authority
try{
    //set the new rate authority using Solana's setAuthority function
    await setAuthority(
        connection,
        payer,
        mint,
        rateAuthority,
        AuthorityType.InterestRate,
        otherAccount.publicKey,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
    );

    //update the interest using the new rate authority
    await updateRateInterestBearingMint(
        connection,
        payer,
        mint,
        otherAccount, //new authority
        10, //new rate
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
    );

    //get the new set interest rate
    const newRate = await getInterestBearingMint({ connection, mint });
 
    console.log(
        `✅ - We expected this to pass because the rate can be updated with the new authority. New rate: ${newRate}`,
    );

}catch(error){
    console.log("Error has occurred : ", error);
}
