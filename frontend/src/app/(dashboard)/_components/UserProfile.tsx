
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import UserProfileUpdatePage from "./UserProfileUpdate";
import { safeAuth } from "@/lib/safeAuth";

export default async function UserProfilePage() {
    const session = await safeAuth()
    return (
        <div>
            <Dialog>
                <DialogTrigger className="w-full text-left px-2 py-1 cursor-pointer hover:bg-muted-foreground/20">
                    Profile
                </DialogTrigger>

                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Profile</DialogTitle>
                      
                    </DialogHeader>


                    {/* user profile display and editor */}
                    <UserProfileUpdatePage
                        firstName={session?.user.firstName}
                        lastName={session?.user.lastName}
                        email={session?.user.email}
                        device_id={session?.user.device_id}
                        user_roles={session?.user.user_role}

                    />

                </DialogContent>

            </Dialog>
        </div>
    )
}