import QuizResults from '../views/QuizResults';

export default function EPC_Quiz_Results({ route, navigation }) {
  return (
    <QuizResults
      route={route}
      navigation={navigation}
      quizName="EPC Quiz"
      quizRoute="EPC_Quiz"
      settingsRoute="EPC_Quiz_Settings"
      variant="epc"
    />
  );
}
