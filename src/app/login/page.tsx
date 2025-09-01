
"use client";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { auth, db } from "@/app/lib/firebase";
import { fetchUserRole } from "@/app/lib/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (!email || !password) {
            setError("Please fill in all fields");
            setIsLoading(false);
            return;
        }

        // Hardcoded admin credentials check (fallback for demo). Prefer Firestore role or ADMIN_EMAILS.
        const isDemoAdmin = email === "aadmin@gmail.com" && password === "admin@1234";

        try {
            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Fetch user data from Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                setError("User data not found. Please contact support.");
                setIsLoading(false);
                return;
            }
            const userData = userDoc.data();
            // Resolve role with helper (supports email allowlist for admins)
            const role = await fetchUserRole(user);
            if (role === "admin" || isDemoAdmin) {
                router.push("/admin");
            } else if (role === "client" || userData.accountType === "client") {
                router.push("/client");
            } else if (role === "driver" || userData.accountType === "driver") {
                router.push("/driver");
            } else {
                router.push("/");
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message ?? "Invalid email or password. Please try again.");
            } else {
                setError("Invalid email or password. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-h-screen bg-white flex font-para text-gray-900 font-poppins tracking-wider">
            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="flex items-center justify-center mb-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-purple-600 rounded-xl mr-3">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-purple-900">Swift Logistics</h1>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2 font-lora">Welcome Back</h2>
                        <p className="text-gray-600">Sign in to continue</p>
                    </div>

                    <div className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                                <div className="flex items-center">
                                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-3 text-gray-500 font-medium">Or sign in with email</span>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="relative">
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField("email")}
                                    onBlur={() => setFocusedField("")}
                                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm transition-all duration-200 ${focusedField === "email"
                                        ? "border-purple-500 bg-purple-50 shadow-lg"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    placeholder="Enter your email address"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                                    Password
                                </label>

                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField("password")}
                                    onBlur={() => setFocusedField("")}
                                    className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl text-sm transition-all duration-200 ${focusedField === "password"
                                        ? "border-purple-500 bg-purple-50 shadow-lg"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>


                        {/* Login Button */}
                        <button
                            onClick={handleLogin}
                            disabled={isLoading || !email || !password}
                            className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center ${isLoading || !email || !password
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg transform hover:-translate-y-0.5"
                                }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Signing In...
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    Sign In
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </div>
                            )}
                        </button>

                    </div>

                    {/* Sign Up Link */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{" "}
                            <a href="/register" className="text-purple-600 hover:text-purple-700 font-semibold">
                                Create account
                            </a>
                        </p>
                    </div>

                    {/* Professional Access */}
                    <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <p className="text-sm font-medium text-purple-900 mb-2">User Dashboard</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <a
                                href="/register?type=client"
                                className="flex-1 text-center px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                            >
                                Client Registration
                            </a>
                            <a
                                href="/register?type=driver"
                                className="flex-1 text-center px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                            >
                                Driver Registration
                            </a>
                        </div>
                    </div>

                    {/* Footer Links */}
                    <div className="mt-6 text-center text-xs text-gray-500">
                        <div className="flex justify-center space-x-4">
                            <a href="/privacy" className="hover:text-gray-700">Privacy Policy</a>
                            <span>•</span>
                            <a href="/terms" className="hover:text-gray-700">Terms of Service</a>
                            <span>•</span>
                            <a href="/help" className="hover:text-gray-700">Help Center</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
