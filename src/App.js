import React, { useEffect, useState } from "react";
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import { ethers } from "ethers";
import myEpicNft from './utils/MyEpicNFT.json';

import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
// Add the domain toy will be minting
const tld = '.fc';
const CONTACT_ADDRESS = '0x8051A17EEfbFA2D9A79B11CB5DBFBc9d1A4b6a17';

const App = () => {
	const [currentAccount, setCurrentAccount] = useState('');
	const [network, setNetwork] = useState('');
	const [editing, setEditing] = useState(false);
	const [mints, setMints] = useState([]);
	const [loading, setLoading] = useState(false);

	// Add some state data properties
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');

		
  	// Implement your connectWallet method here
	const connectWallet = async () => {
		try {
			const { ethereum } = window;

			if (!ethereum) {
				alert("Get MetaMask -> https://metamask.io/");
				return;
			}

			// Fancy method to request access to account.
			const accounts = await ethereum.request({ method: "eth_requestAccounts" });
		
			// Boom! This should print out public address once we authorize Metamask.
			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);
		} catch (error) {
			console.log(error)
		}
	}
  
	// Check if Wallet is connected
	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;

		if (!ethereum) {
			console.log('Make sure you have metamask!');
			return;
		} else {
			console.log('We have the ethereum object', ethereum);
		}

		// Check if we're authorized to access the user's wallet
		const accounts = await ethereum.request({ method: 'eth_accounts' });

		// Users can have multiple authorized accounts, we grab the first one if its there!
		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log('Found an authorized account:', account);
			setCurrentAccount(account);
		} else {
			console.log('No authorized account found');
		}

		// This is the new part, we check the user's network chain ID
		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);

		ethereum.on('chainChanged', handleChainChanged);
		
		// Reload the page when they change networks
		function handleChainChanged(_chainId) {
			window.location.reload();
		}
	};

	// Mint Domain
	const mintDomain = async () => {
		// Don't run if domain is empty
		if (!domain) { return }
		// Alert the user if the domain is to short
		if (!domain.length > 3) {
			alert('Domain must be at least 3 characters long');
			return;
		}
		// Calculate price based on length of domain 
		const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		console.log("Minting domain", domain, "with price", price);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTACT_ADDRESS, myEpicNft.abi, signer);

				console.log("Going to pop wallet now to pay gas...");

				let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
				//Wait for the transaction to be minted
				const receipt = await tx.wait();

				// Check if transaction was successfully completed
				if (receipt.status === 1) {
					console.log("Domain minted! https://mumbai.polygonscan.com/tx/"+tx.hash);

					// Set the record for the domain
					console.log("record = %s", record);
					tx = await contract.setRecord(domain, record);
					const receipt2 = await tx.wait();

					console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);

					// Call fetchMints after 2 seconds
					setTimeout(() => {
						fetchMints();
					}, 2000);

					setRecord('');
					setDomain('');
				}
				else {
					alert("Transaction failed! Please try again");
				}
			}
		}
		catch(error) {
			console.log(error);
		}		
	}

	// Update record
	const updateDomain = async () => {	
		if (!record || !domain) { return }
		setLoading(true);
		console.log("Updating domain", domain, "with record", record);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTACT_ADDRESS, myEpicNft.abi, signer);

				let tx = await contract.setRecord(domain, record);
				await tx.wait;
				console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);

				fetchMints();
				setRecord('');
				setDomain('');
			}
		} catch(error) {
			console.log(error);
		}
		setLoading(false);
	}

	// Get all the domains from the owner
	const fetchMints = async () => {
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTACT_ADDRESS, myEpicNft.abi, signer);

				// Get all the domains from our contract
				const names = await contract.getAllNames();

				// For each name, get record and the address
				const mintRecords = await Promise.all(names.map(async (name) => {
					const mintRecord = await contract.records(name);
					const owner = await contract.domains(name);
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					};
				}));

				console.log("MINTS FETCHED ", mintRecords);
				setMints(mintRecords);
			}
		} catch(error){
			console.log(error);
		}
	}

	// Swith MetaMask Network  
	const switchNetwork = async () => {
		if (window.ethereum) {
			try {
				// Try to switch to the Mumbai testnet
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
				});
			} catch (error) {
				// This error code means that the chain we want has not been added to MetaMask
				// In this case we ask the user to add it to their MetaMask
				if (error.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{	
									chainId: '0x13881',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
											name: "Mumbai Matic",
											symbol: "MATIC",
											decimals: 18
									},
									blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
								},
							],
						});
					} catch (error) {
						console.log(error);
					}
				}
				console.log(error);
			}
		} else {
			// If window.ethereum is not found then MetaMask is not installed
			alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		} 
	}

	// Create a function to render if wallet is not connected yet
	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media.giphy.com/media/OWqeWXcsWNgI0/giphy.gif" alt="space football gif" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
  	);


	// Function to render all Domains Minted
	const renderMints = () => {
		return (
			<div className="mint-container">
				<p className="subtitle"> Recently minted domains!</p>
				<div className="mint-list">
					{ mints.map((mint, index) => {
						return (
							<div className="mint-item" key={index}>
								<div className='mint-row'>
									<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
										<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
									</a>
									{/* If mint.owner is currentAccount, add an "edit" button*/}
									{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
										<button className="edit-button" onClick={() => editRecord(mint.name)}>
											<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
										</button>
										:
										null
									}
								</div>
								<p> {mint.record} </p>
							</div>)
					})}
				</div>
			</div>);
	};

	// Function will take us into edit mode and show us the edit buttons!
	const editRecord = (name) => {
		console.log("Editing record for ", name);
		setEditing(true);
		setDomain(name);
	}

	// Form to enter domain name and data
	const renderInputForm = () => {
		// If not on Polygon Mumbai Testnet, render "Please connect to Polygon Mumbai Testnet"
		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
				<h2>Please switch to Polygon Mumbai Testnet</h2>
				{/* This button will call our switch network function */}
				<button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
			</div>
			);
		}
		return (
			<div className="form-container">
				<div className="first-row">
					<input 
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className="tld"> {tld} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder="What's your stadium?"
					onChange={e => setRecord(e.target.value)}
				/>
					{/* If the editing variable is true, return the "Set record" and "Cancel" button */}
					{editing ? (
						<div className="button-container">
							<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
								Set record
							</button>  
							<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
								Cancel
							</button>  
						</div>
					) : (
						// If editing is not true, the mint button will be returned instead
						<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
							Mint
						</button>  
					)}

			</div>
		)
	}

	// This runs our function when the page loads.
	useEffect(() => {
		checkIfWalletIsConnected();
		if (network === 'Polygon Mumbai Testnet') {
			fetchMints();
		}
	}, [currentAccount, network]);
      
  	return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
						<div className="left">
						<p className="title">⚽ 🏆 Football Name Service 🏆 ⚽</p>
						<p className="subtitle">Your Out of this world API on the blockchain!</p>
						</div>
						
						{/* Display a logo and wallet connection status*/}
						<div className="right">
							<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
							{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>
				</div>

        {/* Hide the connect button if currentAccount isn't empty*/}
		{!currentAccount && renderNotConnectedContainer()}
		
		{/* Render the input form if an account is connected */}
		{currentAccount && renderInputForm()}	

		{/* Render All domains section */}			
		{mints && renderMints()}

        <div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built with @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
