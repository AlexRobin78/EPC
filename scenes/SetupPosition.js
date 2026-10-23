import MenuScreen from '../views/MenuScreen';

export default function Setup_Position({ navigation }) {
  return (
    <MenuScreen
      navigation={navigation}
      title="Setup Position"
      subtitle="Choose how many sides to set up"
      options={[
        { label: "One Player", description: "Set up one side and see its EPC stats", route: 'One_Player' },
        { label: "Two Players", description: "Set up both sides and get a cube decision", route: 'Two_Players' },
      ]}
    />
  );
}
