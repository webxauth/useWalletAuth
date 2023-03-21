import { UserDetail } from "@webxauth/types";
import { useState } from "react";

type TemporaryToken = string;
export const useWalletAuth = (baseURL: string) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const getSigningMessage = async (
		walletAddress: string,
		provider: string
	): Promise<string> => {
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

	const verifySignature = async (
		walletAddress: string,
		provider: string,
		signature: string
	): Promise<TemporaryToken> => {
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
			setError(`Failed to verify signature: ${error.message}`);
			throw new Error(`Failed to verify signature: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	const authenticate = async (
		idToken: string,
		provider: string,
		account: string
	): Promise<{ token: string }> => {
		try {
			setIsLoading(true);
			setError(null);

			const res = await fetch(`${baseURL}/api/auth`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					idToken,
					provider,
					providerId: account,
					userInfo: { walletAddress: account },
				}),
			});

			const data = await res.json();
			return data as { token: string };
		} catch (error: any) {
			setError(`Failed to authenticate: ${error.message}`);
			throw new Error(`Failed to authenticate: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	const decodeAuthToken = async (token: string) => {
		try {
			setIsLoading(true);
			setError(null);

			const res = await fetch(`${baseURL}/api/jwt/verify`, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": `Bearer ${token}`
				},
			});
			const decodedToken = await res.json();

			return decodedToken as UserDetail;
		} catch (error: any) {
			setError(`Failed to decode auth token: ${error.message}`);
			throw new Error(`Failed to decode auth token: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	const authenticateWallet = async (
		signedMessage: string,
		account: string,
		provider: string
	) => {
		try {
			setIsLoading(true);
			setError(null);

			const temporaryToken = await verifySignature(
				account,
				provider,
				signedMessage
			);

			const { token } = await authenticate(temporaryToken, provider, account);

			const decodedToken = await decodeAuthToken(token);

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
		verifySignature,
		authenticate,
		decodeAuthToken,
		authenticateWallet,
	};
};
