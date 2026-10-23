import MenuScreen from '../views/MenuScreen';

export default function Quiz({ navigation }) {
  return (
    <MenuScreen
      navigation={navigation}
      title="Quiz"
      subtitle="Choose a topic to practice"
      options={[
        { label: "EPC", description: "Practice estimating effective pip count", route: 'EPC_Quiz_Settings' },
        { label: "Benjamin Count", description: "Practice the Benjamin count", route: 'Benjamin_Quiz_Settings' },
      ]}
    />
  );
}
