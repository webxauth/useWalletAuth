import { UserDetail } from "@webxauth-types";
import { useState } from "react";

const useWalletAuth = (baseURL: string) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const getSigningMessage = async (walletAddress: string, provider: string) => {
		try {
			setIsLoading(true);
			setError(null);
			const res = await fetch(`${baseURL}/api/web3`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					provider,
					walletAddress,
				}),
			});
			const { message } = (await res.json()) as { message: string };
			return message;
		} catch (error: any) {
			setError(`Failed to get signing message: ${error.message}`);
			throw new Error(`Failed to get signing message: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	const verifyAndAuthenticate = async (
		walletAddress: string,
		provider: string,
		signature: string
	) => {
		try {
			setIsLoading(true);
			setError(null);

			const body = JSON.stringify({
				provider,
				walletAddress,
				signature,
			});

			const res = await fetch(`${baseURL}/api/web3/verify`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body,
			});

			const json: { token: string } = await res.json();

			return json.token;
		} catch (error: any) {
			setError(`Failed to verify and authenticate: ${error.message}`);
			throw new Error(`Failed to verify and authenticate: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	const sendIdToken = async (
		idToken: string,
		provider: string,
		account: string
	) => {
		try {
			setIsLoading(true);
			setError(null);

			const res = await fetch(`${baseURL}/api/generate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
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
			setError(`Failed to verify and authenticate: ${error.message}`);
			throw new Error(`Failed to verify and authenticate: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	const GetDecodeAuthToken = async (tokenResonse: string) => {
		try {
			setIsLoading(true);
			setError(null);

			const res = await fetch(`${baseURL}/api/jwt/verify`, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: `token=${tokenResonse}`,
			});
			const decodedToken = await res.json();

			return decodedToken as UserDetail;
		} catch (error: any) {
			setError(`Failed to verify and authenticate: ${error.message}`);
			throw new Error(`Failed to get signing message: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	const GetDecodedToken = async (signedMessage: string, account: string) => {
		try {
			setIsLoading(true);
			setError(null);

			const token = await verifyAndAuthenticate(account, "evm", signedMessage);

			const tokenResonse = await sendIdToken(token, "web3", account);

			const decodedToken = await GetDecodeAuthToken(tokenResonse);

			return decodedToken;
		} catch (error: any) {
			setError(error.message);
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		isLoading,
		error,
		getSigningMessage,
		verifyAndAuthenticate,
		sendIdToken,
		GetDecodeAuthToken,
		GetDecodedToken,
	};
};

export default useWalletAuth;
