import { clerkMiddleware } from "@clerk/nextjs/server";

// Nothing is forced behind a login here. Individual routes decide for
// themselves, so a signed-out visitor can still try the product.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv)).*)",
    "/(api|trpc)(.*)",
  ],
};
