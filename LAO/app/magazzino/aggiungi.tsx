import {View, Text, TextInput} from "react-native";
import {useState} from "react";
export default function AggiungiMagazzino() {
const [nomeMateriale, setNomeMateria] = useState("");
const [quantita, setQuantita] = useState("");
    return (
       <View style={{ flex: 1 }}>
           <View> <Text>aggiungi elemento nel maggazzino</Text>
               <TextInput
                   value={nomeMateriale}
                   onChangeText={setNomeMateria}
                   placeholder="nome materiale"/>

               <Text>hai inserito {nomeMateriale}</Text> </View>

           <View>
               <Text>aggiungi quantita</Text>
               <TextInput
                   value={quantita}
                   onChangeText={setQuantita}
                   placeholder="quantita"/>
           </View>

       </View>

    );
}
