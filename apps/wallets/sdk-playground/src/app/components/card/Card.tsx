/** @format */
import Button from "../button/Button";

interface CardTypes {
    name: string;
    description: string;
    image: string;
    action: string;
    tokenId: string;
    onActionClick: (tokenId: string) => void;
    listOnReservoir: () => void;
    loading?: boolean;
}

const Card = ({ name, description, image, action, tokenId, onActionClick, loading }: CardTypes) => {
    return (
        <div className="flex flex-col justify-center items-center w-full min-w-[8.625rem] md:w-[14.5rem] md:h-auto">
            <div className="flex md:p-[1rem] flex-col items-center rounded-lg md:border md:border-[#E7E9ED] bg-[#FFF]">
                <img
                    src={image}
                    alt="Card"
                    className="min-w-[8.625rem] md:w-[12.5rem] min-h-[8.625rem] md:h-[12.5rem] rounded-lg mb-[0.5rem]"
                />

                <div className="flex flex-col items-start w-full md:w-[12.5rem] h-auto px-2">
                    <p className="text-base text-[#20343E] font-bold">{name}</p>
                    <p className="text-sm text-[#67797F] font-normal">{description}</p>
                </div>
                <Button
                    onClick={() => onActionClick(tokenId)}
                    loading={loading}
                    type="tertiary"
                    className="flex text-[#20343E] mt-[1rem] md:mt-[2rem] font-semibold h-[2.625rem] py-0.5 px-1.125 flex-col justify-center items-center hover:bg-[#278271] hover:text-[#FFF] self-stretch rounded-md"
                >
                    {action}
                </Button>
                {/* <Button onClick={listOnReservoir}
          type="tertiary"
          className="flex text-[#20343E] mt-[1rem] md:mt-[2rem] font-semibold h-[2.625rem] py-0.5 px-1.125 flex-col justify-center items-center hover:bg-[#278271] hover:text-[#FFF] self-stretch rounded-md"
        >
          List on Reservoir
        </Button> */}
            </div>
        </div>
    );
};

export default Card;
