import { useCallback, useMemo, useState, type PropsWithChildren } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, apiErrorMessage, clearSessionHint, type RegisterPayload } from "../../lib/api";
import type { User } from "../../types/api";
import { AuthContext, type AuthContextValue } from "./auth-context";

function normalizeStatus(payload: { user: User } | User) {
  return "user" in payload ? payload.user : payload;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [sessionKnown, setSessionKnown] = useState(true);
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      try {
        return await authApi.profile();
      } catch (queryError) {
        clearSessionHint();
        setSessionKnown(false);
        throw queryError;
      }
    },
    enabled: sessionKnown,
    retry: false,
    staleTime: 60_000
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setError(null);
      setSessionKnown(true);
      queryClient.setQueryData(["profile"], data.user);
    },
    onError: (mutationError) => setError(apiErrorMessage(mutationError))
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => {
      const form = new FormData();
      form.set("email", payload.email);
      form.set("password", payload.password);
      form.set("nombre_completo", payload.nombre_completo);
      form.set("apellidos", payload.apellidos);
      form.set("direccion", payload.direccion);
      form.set("edad", payload.edad);
      form.set("telefono", payload.telefono);
      form.set("role", payload.role);
      if (payload.foto_identificacion) form.set("foto_identificacion", payload.foto_identificacion);
      if (payload.accepted_documents && payload.accepted_documents.length > 0) {
        form.set("accepted_documents", JSON.stringify(payload.accepted_documents));
      }
      return authApi.register(form);
    },
    onSuccess: () => setError(null),
    onError: (mutationError) => setError(apiErrorMessage(mutationError))
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearSessionHint();
      setSessionKnown(false);
      queryClient.setQueryData(["profile"], null);
      queryClient.removeQueries({ queryKey: ["profile"] });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) => authApi.changePassword(payload),
    onSuccess: (updatedUser) => {
      setError(null);
      queryClient.setQueryData(["profile"], updatedUser);
    },
    onError: (mutationError) => setError(apiErrorMessage(mutationError))
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginMutation.mutateAsync({ email, password });
      setSessionKnown(true);
      return response.user;
    },
    [loginMutation]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      return registerMutation.mutateAsync(payload);
    },
    [registerMutation]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      return changePasswordMutation.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword
      });
    },
    [changePasswordMutation]
  );

  const refreshProfile = useCallback(async () => {
    setSessionKnown(true);
    const data = await queryClient.fetchQuery({ queryKey: ["profile"], queryFn: authApi.profile });
    return data ?? null;
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: profileQuery.data ? normalizeStatus(profileQuery.data) : null,
      loading:
        (sessionKnown && profileQuery.isLoading) ||
        loginMutation.isPending ||
        registerMutation.isPending ||
        logoutMutation.isPending ||
        changePasswordMutation.isPending,
      error,
      login,
      register,
      logout,
      changePassword,
      refreshProfile
    }),
    [changePassword, changePasswordMutation.isPending, error, login, loginMutation.isPending, logout, logoutMutation.isPending, profileQuery.data, profileQuery.isLoading, refreshProfile, register, registerMutation.isPending, sessionKnown]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
