import React, { useState, useEffect } from 'react';
import { Button, Input, Space, message, Typography, AutoComplete, Select } from 'antd';
import axios from 'axios';
import cityData from './cityData';

const { Text } = Typography;
const { Option } = Select;

const App = () => {
  const [inputText, setInputText] = useState('');
  const [words, setWords] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [kaspiNumber, setKaspiNumber] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [currentField, setCurrentField] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [editingField, setEditingField] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('https://greenman.kz/api/products');
        setProducts(response.data);
        setFilteredProducts(response.data);
      } catch (error) {
        message.error('Ошибка при загрузке продуктов');
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const calculateTotalPrice = () => {
      const total = cart.reduce((sum, item) => sum + item.type.price * item.quantity, 0);
      setTotalPrice(total);
    };
    calculateTotalPrice();
  }, [cart, deliveryMethod]);

  const handleInsertTextFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      processText(text);
    } catch (err) {
      message.error('Ошибка при чтении из буфера обмена');
    }
  };

  const handleInsertText = () => {
    processText(inputText);
    setInputText('');
  };

  const processText = (text) => {
    const regex = /(\+7\s?\d{3}\s?\d{3}\s?\d{4})|(8\s?\д{3}\с?\д{3}\с?\д{4})/g;
    let newWords = [];
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        newWords.push(...text.slice(lastIndex, match.index).split(/[ ,.?!:;()]+/).filter(Boolean));
      }
      const phoneNumber = match[0].replace(/\D/g, '');
      newWords.push(phoneNumber.length === 11 ? phoneNumber.slice(1) : phoneNumber);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      newWords.push(...text.slice(lastIndex).split(/[ ,.?!:;()]+/).filter(Boolean));
    }

    setWords(newWords);
  };

  const handleWordClick = (word) => {
    if (currentField === 'customerName') {
      setCustomerName(prev => prev ? `${prev} ${word}` : word);
    } else if (currentField === 'phoneNumber') {
      setPhoneNumber(prev => {
        setKaspiNumber(prev ? `${prev}${word}` : word);
        return prev ? `${prev}${word}` : word;
      });
    } else if (currentField === 'kaspiNumber') {
      setKaspiNumber(word);
    } else if (currentField === 'city') {
      setCity(word);
      const citySuggestion = findCityIndex(word);
      if (citySuggestion) {
        setPostalCode(citySuggestion.index);
      }
    } else if (currentField === 'address') {
      setStreet(prev => prev ? `${prev} ${word}` : word);
      setHouseNumber(word);
    } else if (currentField === 'postalCode') {
      setPostalCode(word);
    }
  };

  const findCityIndex = (cityName) => {
    for (const region of cityData) {
      for (const cities of Object.values(region)) {
        const city = cities.find(c => c.city.toLowerCase() === cityName.toLowerCase());
        if (city) {
          return city;
        }
      }
    }
    return null;
  };

  const handleSelectProduct = (value, option) => {
    const selectedProduct = products.find(product => product.types.some(type => `${product.name} ${type.type}` === value));
    const selectedType = selectedProduct.types.find(type => `${selectedProduct.name} ${type.type}` === value);
    setCart([...cart, { ...selectedProduct, type: selectedType, quantity: 1 }]);
    setProductSearch('');
  };

  const handleOrderSubmit = async () => {
    const products = cart.map(item => ({
      productId: item.id,
      quantity: item.quantity,
      typeId: item.type.id,
    }));

    const streetAndHouse = street.split(' ');
    const houseNumber = streetAndHouse.pop();
    const streetName = streetAndHouse.join(' ');

    const orderData = {
      customerName,
      addressIndex: postalCode,
      city,
      street: streetName,
      houseNumber,
      phoneNumber,
      deliveryMethod,
      paymentMethod,
      products,
      totalPrice,
      kaspiNumber,
    };

    try {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTcxNzQwNTQ3OCwiZXhwIjoxODAzODA1NDc4fQ.zE8dCvNWGmQbTUKo-B6evYxe-hwlXGknl_75iOMsVw8"
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.post('https://greenman.kz/api/orders/add', orderData, config);
      message.success('Заказ успешно оформлен!');
      handleReset();
    } catch (error) {
      message.error('Ошибка при отправке заказа');
    }
  };

  const handleProductSearch = (value) => {
    setProductSearch(value);
    const filtered = products.filter(product =>
        product.name.toLowerCase().includes(value.toLowerCase()) ||
        product.types.some(type => type.type.toLowerCase().includes(value.toLowerCase()))
    );
    setFilteredProducts(filtered);
  };

  const productOptions = filteredProducts.flatMap(product =>
      product.types.map(type => ({
        value: `${product.name} ${type.type}`,
        label: `${product.name} ${type.type}`,
      }))
  );

  const calculateDeliveryCost = () => {
    if (deliveryMethod === 'kazpost') {
      const totalVolume = cart.reduce((sum, item) => {
        const typeDescription = item.type.type;
        const volumeMatch = typeDescription.match(/\b\d+\b/);
        let volume = 1000;
        if (volumeMatch && volumeMatch[0]) {
          volume = parseInt(volumeMatch[0], 10);
          if (volume < 300) {
            volume = 1000;
          }
        }
        return sum + volume * item.quantity;
      }, 0);

      const basePrice = 1600;
      if (totalVolume <= 1000) {
        return basePrice;
      } else {
        const extraVolume = totalVolume - 1000;
        const extraCost = Math.ceil(extraVolume / 1000) * 400;
        return basePrice + extraCost;
      }
    } else if (deliveryMethod === 'indrive') {
      return 0;
    }
    return 600;
  };

  const deliveryCost = calculateDeliveryCost();
  const finalTotal = totalPrice + deliveryCost;

  const handleReset = () => {
    setCustomerName('');
    setPhoneNumber('');
    setKaspiNumber('');
    setCity('');
    setStreet('');
    setHouseNumber('');
    setPostalCode('');
    setDeliveryMethod('');
    setPaymentMethod('');
    setCart([]);
    setTotalPrice(0);
  };

  return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button onClick={handleInsertTextFromClipboard} type="primary">Вставить из буфера</Button>
          <Button onClick={() => setShowManualInput(!showManualInput)} type="default">+</Button>
          {showManualInput && (
              <>
                <Input
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Введите текст"
                />
                <Button onClick={handleInsertText} type="primary">Вставить</Button>
              </>
          )}
        </Space>
        <div style={{ marginTop: '20px' }}>
          {words.map((word, index) => (
              <Button
                  key={index}
                  style={{ margin: '5px' }}
                  onClick={() => handleWordClick(word)}
              >
                {word}
              </Button>
          ))}
        </div>
        <Space style={{ marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button onClick={() => setCurrentField('customerName')} type="dashed" style={{ backgroundColor: '#d9f7be' }}>Имя и Фамилия</Button>
          <Button onClick={() => setCurrentField('phoneNumber')} type="dashed" style={{ backgroundColor: '#fff2e8' }}>Номер телефона</Button>
          <Button onClick={() => setCurrentField('kaspiNumber')} type="dashed" style={{ backgroundColor: '#e6f7ff' }}>Номер телефона Kaspi</Button>
          <Button onClick={() => setCurrentField('city')} type="dashed" style={{ backgroundColor: '#fffbe6' }}>Город</Button>
          <Button onClick={() => setCurrentField('address')} type="dashed" style={{ backgroundColor: '#fff0f6' }}>Адрес</Button>
          <Button onClick={() => setCurrentField('postalCode')} type="dashed" style={{ backgroundColor: '#f0f5ff' }}>Почтовый индекс</Button>
        </Space>
        <div style={{ marginTop: '20px' }}>
          <AutoComplete
              style={{ width: '100%' }}
              value={productSearch}
              options={productOptions}
              onSelect={handleSelectProduct}
              onSearch={handleProductSearch}
              placeholder="Введите название продукта"
          />
        </div>
        <Space style={{ marginTop: '20px', width: '100%' }}>
          <Select
              style={{ width: '100%' }}
              placeholder="Выберите метод доставки"
              onChange={setDeliveryMethod}
          >
            <Option value="kazpost">Казпочта</Option>
            <Option value="indrive">InDrive</Option>
            <Option value="city">Доставка по городу</Option>
          </Select>
          <Select
              style={{ width: '100%' }}
              placeholder="Выберите метод оплаты"
              onChange={setPaymentMethod}
          >
            <Option value="money">Наличные</Option>
            <Option value="kaspi">Kaspi</Option>
          </Select>
        </Space>
        <Button onClick={handleOrderSubmit} type="primary" style={{ marginTop: '20px', width: '100%' }}>Отправить</Button>
        <Button onClick={handleReset} type="default" style={{ marginTop: '10px', width: '100%' }}>Сбросить</Button>
        <div style={{ marginTop: '20px' }}>
          <Text strong>Имя и Фамилия: </Text>
          {editingField === 'customerName' ? (
              <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
              />
          ) : (
              <Text onClick={() => setEditingField('customerName')}>{customerName}</Text>
          )}
          <br />
          <Text strong>Номер телефона: </Text>
          {editingField === 'phoneNumber' ? (
              <Input
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setKaspiNumber(e.target.value);
                  }}
                  onBlur={() => setEditingField(null)}
                  autoFocus
              />
          ) : (
              <Text onClick={() => setEditingField('phoneNumber')}>{phoneNumber}</Text>
          )}
          <br />
          <Text strong>Номер телефона Kaspi: </Text>
          {editingField === 'kaspiNumber' ? (
              <Input
                  value={kaspiNumber}
                  onChange={(e) => setKaspiNumber(e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
              />
          ) : (
              <Text onClick={() => setEditingField('kaspiNumber')}>{kaspiNumber}</Text>
          )}
          <br />
          <Text strong>Город: </Text>
          {editingField === 'city' ? (
              <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
              />
          ) : (
              <Text onClick={() => setEditingField('city')}>{city}</Text>
          )}
          <br />
          <Text strong>Адрес: </Text>
          {editingField === 'address' ? (
              <Input
                  value={`${street} ${houseNumber}`}
                  onChange={(e) => {
                    const addressParts = e.target.value.split(' ');
                    setStreet(addressParts.slice(0, -1).join(' '));
                    setHouseNumber(addressParts.slice(-1)[0]);
                  }}
                  onBlur={() => setEditingField(null)}
                  autoFocus
              />
          ) : (
              <Text onClick={() => setEditingField('address')}>{street} {houseNumber}</Text>
          )}
          <br />
          <Text strong>Почтовый индекс: </Text>
          {editingField === 'postalCode' ? (
              <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
              />
          ) : (
              <Text onClick={() => setEditingField('postalCode')}>{postalCode}</Text>
          )}
          <br />
          <Text strong>Метод доставки: </Text><Text>{deliveryMethod}</Text><br />
          <Text strong>Метод оплаты: </Text><Text>{paymentMethod}</Text><br />
          <Text strong>Корзина: </Text>
          <ul>
            {cart.map((item, index) => (
                <li key={index}>
                  {item.name} - {item.type.type} - {item.quantity} шт.
                </li>
            ))}
          </ul>
          <Text strong>Сумма заказа: </Text><Text>{totalPrice} KZT</Text><br />
          <Text strong>Стоимость доставки: </Text><Text>{deliveryCost} KZT</Text><br />
          <Text strong>Итоговая сумма: </Text><Text>{finalTotal} KZT</Text>
        </div>
      </div>
  );
};

export default App;
