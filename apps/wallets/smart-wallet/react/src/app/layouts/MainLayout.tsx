import HeaderComponent from "../components/header/HeaderComponent";

export const MainLayout = ({ children }: any) => {
    console.log("children: ", children);
    return (
        <div>
            <HeaderComponent />
            <div className="md:mt-[2.5rem]">{children}</div>
        </div>
    );
};
