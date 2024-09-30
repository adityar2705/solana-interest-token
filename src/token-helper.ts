import {
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createInitializeInterestBearingMintInstruction,
    createInitializeMintInstruction,
    getMintLen,
} from "@solana/spl-token";
import {
    sendAndConfirmTransaction,
    Connection,
    Keypair,
    Transaction,
    PublicKey,
    SystemProgram,
} from "@solana/web3.js";

//function to create the interest bearing token
export async function createTokenWithInterestRateExtension(
    connection : Connection,
    payer : Keypair,
    mint : PublicKey,
    rateAuthority : Keypair,
    rate : number,
    mintKeypair : Keypair
){
    //the account that has control over the mint account
    const mintAuthority = payer;
    const decimals = 9;

    const extensions = [ExtensionType.InterestBearingConfig];

    //get the size of the mint account and rent for the mint account
    const mintLen = getMintLen(extensions);
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    //creating mint transaction
    const mintTransaction = new Transaction().add(
        //create the mint account
        SystemProgram.createAccount({
            fromPubkey : payer.publicKey,
            newAccountPubkey : mint,
            space : mintLen,
            lamports : mintLamports,
            programId : TOKEN_2022_PROGRAM_ID
        }),

        //create initialize interest bearing mint instruction
        createInitializeInterestBearingMintInstruction(
            mint, 
            rateAuthority.publicKey,
            rate,
            TOKEN_2022_PROGRAM_ID
        ),

        //initialize the mint account
        createInitializeMintInstruction(
            mint,
            decimals,
            mintAuthority.publicKey,
            null,
            TOKEN_2022_PROGRAM_ID
        ),
    );

    //send and confirm transaction
    await sendAndConfirmTransaction(
        connection,
        mintTransaction,
        [payer, mintKeypair],
        undefined,
    )    
    
}