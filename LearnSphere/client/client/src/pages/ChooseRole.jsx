import AuthLayout from '../components/AuthLayout'
import AccountTypeChooser from '../components/AccountTypeChooser'

function ChooseRole() {
  return (
    <AuthLayout mode="login">
      <AccountTypeChooser />
    </AuthLayout>
  )
}

export default ChooseRole
