"use client";
import { useState } from "react";
import { Eye, EyeOff, Check, X, User, Mail, Lock, Shield, Heart, Sparkles } from "lucide-react";
import { auth, db } from "@/app/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import router from "next/router";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [accountType, setAccountType] = useState("client");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedField, setFocusedField] = useState("");

    const passwordValidation = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
    };

    const isPasswordValid = Object.values(passwordValidation).every(Boolean);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSignUp = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        if (!isPasswordValid) {
            setError("Please ensure your password meets all requirements");
            setIsLoading(false);
            return;
        }

        try {
            // Create user with Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Update display name
            await updateProfile(user, { displayName: fullName });
            // Save additional data to Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                fullName,
                email,
                accountType,
                createdAt: new Date().toISOString(),
            });
            router.push('/login');
            // Optionally redirect or show success
            // window.location.href = "/login";
            setError("");
            alert("Account created successfully!");
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An error occurred while creating your account");
            }
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="min-h-screen bg-white flex font-para text-gray-900">

            {/* Right Side - Registration Form */}
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
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
                        <p className="text-gray-600">Get started for track your order</p>
                    </div>

                    <div className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                                <div className="flex items-center">
                                    <X className="w-5 h-5 text-red-400 mr-2" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Full Name */}
                        <div className="relative">
                            const router = useRouter();
                            router.push('/login');
                            Full Name
                       
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="fullName"
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                onFocus={() => setFocusedField("fullName")}
                                onBlur={() => setFocusedField("")}
                                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm transition-all duration-200 ${focusedField === "fullName"
                                    ? "border-purple-500 bg-purple-50 shadow-lg"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                                placeholder="Enter your full name"
                            />
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
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                            Password
                        </label>
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
                                placeholder="Create a strong password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Password Requirements */}
                        {password && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center text-xs">
                                        {passwordValidation.length ? (
                                            <Check className="w-3 h-3 text-green-500 mr-1" />
                                        ) : (
                                            <X className="w-3 h-3 text-red-500 mr-1" />
                                        )}
                                        <span className={passwordValidation.length ? "text-green-600" : "text-red-600"}>
                                            8+ characters
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs">
                                        {passwordValidation.uppercase ? (
                                            <Check className="w-3 h-3 text-green-500 mr-1" />
                                        ) : (
                                            <X className="w-3 h-3 text-red-500 mr-1" />
                                        )}
                                        <span className={passwordValidation.uppercase ? "text-green-600" : "text-red-600"}>
                                            Uppercase
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs">
                                        {passwordValidation.lowercase ? (
                                            <Check className="w-3 h-3 text-green-500 mr-1" />
                                        ) : (
                                            <X className="w-3 h-3 text-red-500 mr-1" />
                                        )}
                                        <span className={passwordValidation.lowercase ? "text-green-600" : "text-red-600"}>
                                            Lowercase
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs">
                                        {passwordValidation.number ? (
                                            <Check className="w-3 h-3 text-green-500 mr-1" />
                                        ) : (
                                            <X className="w-3 h-3 text-red-500 mr-1" />
                                        )}
                                        <span className={passwordValidation.number ? "text-green-600" : "text-red-600"}>
                                            Number
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onFocus={() => setFocusedField("confirmPassword")}
                                onBlur={() => setFocusedField("")}
                                className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl text-sm transition-all duration-200 ${focusedField === "confirmPassword"
                                    ? "border-purple-500 bg-purple-50 shadow-lg"
                                    : confirmPassword && (passwordsMatch ? "border-green-300" : "border-red-300")
                                    || "border-gray-200 hover:border-gray-300"
                                    }`}
                                placeholder="Confirm your password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {confirmPassword && (
                            <div className="mt-2 flex items-center text-xs">
                                {passwordsMatch ? (
                                    <>
                                        <Check className="w-3 h-3 text-green-500 mr-1" />
                                        <span className="text-green-600">Passwords match</span>
                                    </>
                                ) : (
                                    <>
                                        <X className="w-3 h-3 text-red-500 mr-1" />
                                        <span className="text-red-600">Passwords don't match</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Account Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Account Type
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${accountType === "client"
                                ? "border-purple-500 bg-purple-50 shadow-md"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}>
                                <input
                                    type="radio"
                                    name="accountType"
                                    value="client"
                                    checked={accountType === "client"}
                                    onChange={(e) => setAccountType(e.target.value)}
                                    className="sr-only"
                                />
                                <div className="flex items-center w-full">
                                    <User className="w-5 h-5 text-purple-600 mr-3" />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">Client</div>
                                        <div className="text-xs text-gray-500">Process Order</div>
                                    </div>
                                    {accountType === "client" && (
                                        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                            </label>

                            <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${accountType === "driver"
                                ? "border-purple-500 bg-purple-50 shadow-md"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}>
                                <input
                                    type="radio"
                                    name="accountType"
                                    value="driver"
                                    checked={accountType === "driver"}
                                    onChange={(e) => setAccountType(e.target.value)}
                                    className="sr-only"
                                />
                                <div className="flex items-center w-full">
                                    <Heart className="w-5 h-5 text-purple-600 mr-3" />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">Driver</div>
                                        <div className="text-xs text-gray-500">Take Orders</div>
                                    </div>
                                    {accountType === "driver" && (
                                        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Terms */}
                    <div className="flex items-start">
                        <input
                            type="checkbox"
                            id="terms"
                            required
                            className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                            I agree to the{" "}
                            <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
                                Terms of Service
                            </a>{" "}
                            and{" "}
                            <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
                                Privacy Policy
                            </a>
                        </label>
                    </div>

                    {/* Create Account Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !isPasswordValid || !passwordsMatch}
                        onClick={handleSignUp}
                        className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${isLoading || !isPasswordValid || !passwordsMatch
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg transform hover:-translate-y-0.5"
                            }`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transdriver rounded-full animate-spin mr-2"></div>
                                Creating Account...
                            </div>
                        ) : (
                            "Create Account"
                        )}
                    </button>
                </div>


                {/* Sign In Link */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{" "}
                        <a href="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                            Sign in
                        </a>
                    </p>
                </div>

            </div>
        </div>
        </div >
    );
}