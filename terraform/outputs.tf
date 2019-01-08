output "access_key_id" {
  value = "${aws_iam_access_key.citizen.id}"
}

output "secret_access_key" {
  value = "${aws_iam_access_key.citizen.encrypted_secret}"
}
