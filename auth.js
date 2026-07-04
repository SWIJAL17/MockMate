import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { getDb } from "@/lib/mockmate/db"
import { verifyPassword } from "@/lib/mockmate/password"
import { upsertOAuthUser } from "@/lib/mockmate/users"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider && account.provider !== "credentials") {
          const dbUser = await upsertOAuthUser({
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
          })
          token.userId = dbUser.id
          token.provider = account.provider
        } else {
          token.userId = user.id
          token.provider = account?.provider || "credentials"
        }
      }
      return token
    },
  },
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        try {
          const cleanEmail = credentials.email.toString().toLowerCase().trim()
          const db = await getDb()
          const user = await db.collection("users").findOne({ email: cleanEmail })

          if (!user || !user.passwordHash) {
            return null
          }

          const isValid = await verifyPassword(credentials.password.toString(), user.passwordHash)
          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
          }
        } catch (err) {
          console.error("Credentials authorize error:", err)
          return null
        }
      },
    }),
  ],
})
