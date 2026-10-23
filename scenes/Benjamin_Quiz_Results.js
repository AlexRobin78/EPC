import QuizResults from '../views/QuizResults';

export default function Benjamin_Quiz_Results({ route, navigation }) {
  return (
    <QuizResults
      route={route}
      navigation={navigation}
      quizName="Benjamin Count Quiz"
      quizRoute="Benjamin_Quiz"
      settingsRoute="Benjamin_Quiz_Settings"
      variant="benjamin"
    />
  );
}
