import React, { Component } from "react";
import ItemManager from "./contracts/ItemManager.json";
import Item from "./contracts/Item.json"
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  state = {
    cost: 0,
    itemName: "exampleItem1",
    loaded: false, 
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedItemManagerNetwork = ItemManager.networks[networkId];
      const deployedItemNetwork = Item.networks[networkId];

      const itemManager = new web3.eth.Contract(
        ItemManager.abi,
        deployedItemManagerNetwork && deployedItemManagerNetwork.address,
      );

      const item = new web3.eth.Contract(
        Item.abi,
        deployedItemNetwork && deployedItemNetwork.address,
      )

      this.setState({ accounts, web3, itemManager, item, loaded: true })
      this.listenToPaymentEvent();
    } catch (error) {
      console.log("ERROR", error)
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  handleSubmit = async() => {
    try {
      const { cost, itemName } = this.state;
      console.log(itemName, cost, this.state.itemManager);
      let result = await this.state.itemManager.methods.createItem(itemName, cost).send({ from: this.state.accounts[0] });
      console.log(result.events);
      console.log('supply chain step results', result.events.SupplyChainStep.returnValues);
      alert("Send "+cost+" Wei to "+result.events.SupplyChainStep.returnValues._address);
    } catch (e) {
      console.log('failed to create item', e);
    }
  };

  handleInputChange = (event) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  listenToPaymentEvent = () => {
    const { itemManager } = this.state;
    itemManager.events.SupplyChainStep().on('data', async (e) => {
      if (e.returnValues && e.returnValues._step === "1") {
        const item = await itemManager.methods.items(e.returnValues._itemIndex).call();
        console.log(item);
        alert(`Item ${item._identifier} was paid, delivery will be arranged`);
      }

      console.log("event:", e)
    })

    itemManager.events.SupplyChainStep().on('error', async (e) => {
      console.log('error', e)
    })
  }

  listenToDeliveryEvent = () => {
    const { item } = this.state;
    item.events.SupplyChainStep().on('data', async (e) => {
      if (e.returnValues && e.returnValues._step === 2) {
        const val = await item.methods.items()
      }
    })
  }

  render() {
    if (!this.state.loaded) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <h1>Simply Payment/Supply Chain Example!</h1>
        <h2>Items</h2>

        <h2>Add Element</h2>
        Cost: <input type="text" name="cost" value={this.state.cost} onChange={this.handleInputChange} />
        Item Name: <input type="text" name="itemName" value={this.state.itemName} onChange={this.handleInputChange} />
        <button type="button" onClick={this.handleSubmit}>Create new Item</button>
      </div>
    );
  }
}

export default App;
