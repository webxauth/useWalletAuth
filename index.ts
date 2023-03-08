/*
 *    FRAMEWORK
 */
import { useCallback, useEffect, useMemo, useState } from "react";

// @Mostafatalaat770 You might not need this ...
export function hasMessageProperty(obj: unknown): obj is { message: string } {
  return typeof obj === "object" && obj !== null && "message" in obj;
}

// @Mostafatalaat770 Replace with @webxauth/types
type UserAuthInfo = any;

// @Mostafatalaat770 This should be configurable.
const TOKEN_SERVICE_ENDPOINT = "https://auth.bonuz.market";

export const getSigningMessage = async (
  walletAddress: string,
  provider: string
) => {
  try {
    const res = await fetch(`${TOKEN_SERVICE_ENDPOINT}/api/web3`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        provider,
        walletAddress,
      }),
    });
    const { message } = (await res.json()) as { message: string };
    return message;
  } catch (error: any) {
    throw new Error(`Failed to get signing message: ${error.message}`);
  }
};

const verifyAndAuthenticate = async (
  walletAddress: string,
  provider: string,
  signature: string
) => {
  try {
    const body = JSON.stringify({
      provider,
      walletAddress,
      signature,
    });
    console.log("verifyAndAuthenticate ::: body ::: stringified", body);

    const res = await fetch(`${TOKEN_SERVICE_ENDPOINT}/api/web3/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body,
    });
    const json: { token: string } = await res.json();

    console.log(
      "verifyAndAuthenticate ::: response json ::: stringified",
      JSON.stringify(json)
    );

    return json.token;
  } catch (error: unknown) {
    console.log("verifyAndAuthenticate ::: error", error);
    console.log(
      "verifyAndAuthenticate ::: error ::: stringified",
      JSON.stringify(error)
    );

    if (error instanceof Error || hasMessageProperty(error)) {
      throw new Error(`Failed to verify and authenticate: ${error.message}`);
    } else {
      throw new Error(`Failed to verify and authenticate: unknown error`);
    }
  }
};

const sendIdToken = async (
  idToken: string,
  provider: string,
  account: string
) => {
  try {
    const res = await fetch(`${TOKEN_SERVICE_ENDPOINT}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      credentials: "include",
      body: JSON.stringify({
        idToken,
        provider,
        providerId: account,
        userInfo: { walletAddress: account },
      }),
    });
    const { token } = await res.json();
    return token;
  } catch (error: any) {
    throw new Error(`Failed to verify and authenticate: ${error.message}`);
  }
};

export const GetDecodeAuthToken = async (tokenResonse: string) => {
  try {
    const res = await fetch(`${TOKEN_SERVICE_ENDPOINT}/api/jwt/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `token=${tokenResonse}`,
    });
    const decodedToken = (await res.json()) as UserAuthInfo;

    return decodedToken;
  } catch (error: any) {
    throw new Error(`Failed to get signing message: ${error.message}`);
  }
};

export const requestWalletConnectSign = async (
  connector: any,
  onSuccess: (decodedToken: UserAuthInfo) => void,
  onError: (status: any) => void
) => {
  console.log(
    "App ::: onClickWalletConnect  ::: connector.session",
    connector.session
  );

  const { accounts, key } = connector.session;
  const account = accounts[0];

  const message = await getSigningMessage(account, "evm");
  console.log("WalletConnectivity ::: getSigningMessage ::: message", message);

  connector
    .sendCustomRequest({
      id: 1,
      jsonrpc: "2.0",
      method: "personal_sign",
      params: [message, account],
    })
    .catch(onError)
    .then(async (status: any) => {
      // status is message
      if (status === undefined) {
        return;
      }

      console.log("connector.sendCustomRequest ::: status", status);
      console.log(
        "connector.sendCustomRequest ::: status ::: stringified",
        JSON.stringify(status)
      );

      const decodedToken = await GetDecodedToken(status, account);
      console.log(
        "requestWalletConnectSign ::: decodedToken ::: stringified",
        JSON.stringify(decodedToken)
      );

      if (decodedToken.error !== null || decodedToken.error !== undefined)
        onSuccess(decodedToken);
      else onError(decodedToken.error);
    });
};

export const GetDecodedToken = async (
  signedMessage: string,
  account: string
) => {
  console.log(
    "WalletConnectivity ::: signMessage ::: signedMessage",
    signedMessage
  );

  const token = await verifyAndAuthenticate(account, "evm", signedMessage);

  console.log(
    "WalletConnectivity ::: verifyAndAuthenticate ::: token -> ",
    token
  );

  const tokenResonse = await sendIdToken(token, "web3", account);

  console.log(
    "WalletConnectivity ::: sendIdToken ::: tokenResonse",
    tokenResonse
  );
  const decodedToken = await GetDecodeAuthToken(tokenResonse);
  console.log("WalletConnectivity :::  decodedToken", decodedToken);

  return decodedToken;
};

export const useWalletAuth = (
  connector: any,
  onAuthenticationSuccess: (decodedToken: UserAuthInfo) => Promise<void>,
  _onAuthenticationError?: (error: any) => Promise<void>
) => {
  const [connectionAttempt, setConnectionAttempt] = useState(false);
  const [signingAttempt, setSigningAttempt] = useState(false);

  const onAuthenticationError = async (error: any) => {
    console.log("connector.sendCustomRequest ::: error", error);
    console.log(
      "connector.sendCustomRequest ::: error ::: stringified",
      JSON.stringify(error)
    );

    setSigningAttempt(false);

    _onAuthenticationError && _onAuthenticationError(error);
  };

  useEffect(() => {
    if (connector.connected === true && connectionAttempt === true) {
      setSigningAttempt(true);
      requestWalletConnectSign(
        connector,
        onAuthenticationSuccess,
        onAuthenticationError
      );
    }
  }, [connector, connectionAttempt, signingAttempt]);

  const isConnected = useMemo(
    () => connector.connected,
    [connector, connectionAttempt, signingAttempt]
  );

  const connectWallet = useCallback(() => {
    return connector
      .connect()
      .catch((e: any) => {
        console.log("App ::: onClickWalletConnect ::: catch error", e);
      })
      .then((status: any) => {
        console.log("onClickWalletConnect ::: status", status);
        console.log(
          "onClickWalletConnect ::: status ::: typeof",
          typeof status
        );
        console.log(
          "onClickWalletConnect ::: status ::: stringified",
          JSON.stringify(status)
        );

        if (status instanceof Error) {
          console.log(
            "error",
            status.cause,
            status.message,
            status.name,
            status.stack
          );
          return;
        }
        if (typeof status !== "object") return;

        setConnectionAttempt(true);
      });
  }, [connector]);

  const signWallet = useCallback(() => {
    return requestWalletConnectSign(
      connector,
      onAuthenticationSuccess,
      onAuthenticationError
    );
  }, [connector]);

  const connectOrSign = useCallback(() => {
    if (connector.connected) signWallet();
    else connectWallet();
  }, [connector]);

  return {
    isConnected,

    connectionAttempt,
    setConnectionAttempt,

    signingAttempt,
    setSigningAttempt,

    connectOrSign,
  };
};
