'use client'
import React from "react";
import signUp from "@/firebase/auth/signup";
import { useRouter } from 'next/navigation'

function Page() {
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const router = useRouter()

    const handleForm = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const { result, error } = await signUp(email, password);

        if (error) {
            return console.log(error)
        }

        // else successful
        console.log(result)
        return router.push("/admin")
    }
    return (
        <div className="wrapper">
            <div className="form-wrapper">
                <h1 className="mt-60 mb-30">Sign up</h1>
                <form onSubmit={handleForm} className="form">
                    <label htmlFor="email">
                        <p>Email</p>
                        <input 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
                            required 
                            type="email" 
                            name="email" 
                            id="email" 
                            placeholder="example@mail.com" 
                        />
                    </label>
                    <label htmlFor="password">
                        <p>Password</p>
                        <input 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} 
                            required 
                            type="password" 
                            name="password" 
                            id="password" 
                            placeholder="password" 
                        />
                    </label>
                    <button type="submit">Sign up</button>
                </form>
            </div>
        </div>
    );
}

export default Page;