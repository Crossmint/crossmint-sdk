import { CrossMintButton } from '@crossmint/mint-adapter-react-ui';

export default function Index(): JSX.IntrinsicAttributes {
    return (
        <div
            style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
            <CrossMintButton candyMachineId="sjsjsj" theme="light" />
        </div>
    );
}
