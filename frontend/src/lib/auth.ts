import NextAuth, { DefaultSession } from "next-auth"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./mongodb-client"
import Nodemailer from "next-auth/providers/nodemailer"


declare module "next-auth"{
  interface Session {
    user : {
      firstName : string;
      lastName : string;
      user_role : string;
      device_id : string;
    } & DefaultSession['user']
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
   Nodemailer({
      server: {
        host: "smtp.gmail.com",
        port: 587,
        secure:false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      },
      from: process.env.GMAIL_USER,
    }),
  ],
  pages : {
    error : '/login',
    verifyRequest : "/verify-email",
    signIn : "/login"
  }
})

// import NextAuth from "next-auth"
 
// export const { handlers, signIn, signOut, auth } = NextAuth({
//   providers: [],
// })