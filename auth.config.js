import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

export const authConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    ...(process.env.GITHUB_CLIENT_ID
      ? [GitHub({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id
        token.provider = account?.provider || "credentials"
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.userId || token.sub || null
        session.user.provider = token.provider || "credentials"
      }
      return session
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
}
